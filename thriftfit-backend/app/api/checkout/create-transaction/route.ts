import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, getUserFromRequest } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe";
import { SHIPPING_COSTS, DEFAULT_COURIER } from "@/lib/shipping";

/**
 * POST /api/checkout/create-transaction
 * Requires: Authorization: Bearer <supabase access token>
 * Body: { productId, courier, matchScore, shippingName, shippingPhone,
 *         shippingAddress, returnUrl }
 *
 * `returnUrl` is the frontend's own page URL (e.g. where the prototype
 * HTML is hosted) — Stripe redirects back there with a query string
 * appended, since this backend has no pages of its own to redirect to.
 *
 * Creates a `pending` order and a Stripe Checkout Session, and
 * returns the hosted checkout URL to redirect the browser to. It
 * does NOT mark the item sold. Only the verified webhook in
 * /api/webhooks/stripe does that, once Stripe confirms payment.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    productId,
    courier,
    matchScore,
    shippingName,
    shippingPhone,
    shippingAddress,
    returnUrl,
  } = await req.json();

  if (!productId || !shippingName || !shippingPhone || !shippingAddress) {
    return NextResponse.json(
      { error: "productId, shippingName, shippingPhone, and shippingAddress are required" },
      { status: 400 }
    );
  }

  const selectedCourier = SHIPPING_COSTS[courier] !== undefined ? courier : DEFAULT_COURIER;
  const shippingCost = SHIPPING_COSTS[selectedCourier];

  const { data: product, error: fetchError } = await supabaseServer
    .from("products")
    .select("id, title, price, is_sold, hold_until, held_by")
    .eq("id", productId)
    .single();

  if (fetchError || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const holdValid =
    product.held_by === user.id &&
    product.hold_until &&
    new Date(product.hold_until).getTime() > Date.now();

  if (product.is_sold || !holdValid) {
    return NextResponse.json(
      { error: "Waktu hold sudah habis atau item sudah terjual. Ulangi checkout." },
      { status: 409 }
    );
  }

  const grossAmount = Number(product.price) + shippingCost;

  const { data: order, error: orderError } = await supabaseServer
    .from("orders")
    .insert({
      user_id: user.id,
      product_id: productId,
      match_score: matchScore ?? null,
      courier: selectedCourier,
      shipping_cost: shippingCost,
      status: "pending",
      shipping_name: shippingName,
      shipping_phone: shippingPhone,
      shipping_address: shippingAddress,
    })
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message || "Failed to create order" }, { status: 500 });
  }

  // Base to redirect back to after payment: the frontend's own URL if it
  // sent one, otherwise fall back to this API's own origin.
  const base = (returnUrl && String(returnUrl)) || req.nextUrl.origin;
  const separator = base.includes("?") ? "&" : "?";

  try {
    const checkout = await createCheckoutSession({
      orderId: order.id,
      grossAmount,
      productTitle: product.title,
      customerEmail: user.email,
      successUrl: `${base}${separator}payment=success&order_id=${order.id}`,
      cancelUrl: `${base}${separator}payment=cancel&order_id=${order.id}`,
    });

    return NextResponse.json({
      orderId: order.id,
      checkoutUrl: checkout.url,
      grossAmount,
    });
  } catch (err: any) {
    await supabaseServer.from("orders").delete().eq("id", order.id);
    return NextResponse.json(
      { error: err.message || "Gagal membuat transaksi pembayaran." },
      { status: 502 }
    );
  }
}
