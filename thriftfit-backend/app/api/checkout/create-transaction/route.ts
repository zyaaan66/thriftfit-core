import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, getUserFromRequest } from "@/lib/supabase/server";
import { createSnapTransaction } from "@/lib/midtrans";
import { SHIPPING_COSTS, DEFAULT_COURIER } from "@/lib/shipping";

/**
 * POST /api/checkout/create-transaction
 * Requires: Authorization: Bearer <supabase access token>
 * Body: { productId, courier, matchScore, shippingName, shippingPhone, shippingAddress }
 *
 * This is the real entry point for paying — it creates a `pending`
 * order and a Midtrans Snap transaction, and returns a token for
 * `snap.pay(token, ...)` on the frontend. It does NOT mark the item
 * sold. Only the verified webhook in /api/webhooks/midtrans does
 * that, once Midtrans confirms the payment actually happened — the
 * client can't finalize its own purchase just by saying so.
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

  // gross_amount is computed server-side from the product's real price
  // and a fixed shipping cost table — never trust an amount from the client.
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

  try {
    const snap = await createSnapTransaction({
      orderId: order.id,
      grossAmount,
      customerName: shippingName,
      customerEmail: user.email,
      customerPhone: shippingPhone,
    });

    return NextResponse.json({
      orderId: order.id,
      snapToken: snap.token,
      redirectUrl: snap.redirect_url,
      grossAmount,
    });
  } catch (err: any) {
    // Roll back the pending order if Midtrans couldn't be reached/configured,
    // so it doesn't sit there forever with no way to pay it.
    await supabaseServer.from("orders").delete().eq("id", order.id);
    return NextResponse.json(
      { error: err.message || "Gagal membuat transaksi pembayaran." },
      { status: 502 }
    );
  }
}
