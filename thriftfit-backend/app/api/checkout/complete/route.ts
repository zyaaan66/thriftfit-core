import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, getUserFromRequest } from "@/lib/supabase/server";

/**
 * POST /api/checkout/complete
 * Requires: Authorization: Bearer <supabase access token>
 *
 * ⚠️ DEMO-ONLY PATH. In production, use /api/checkout/create-transaction
 * + /api/webhooks/midtrans instead — that flow only marks an item sold
 * once a real payment gateway confirms payment. This route finalizes
 * a purchase directly from the client's say-so, which is fine for
 * testing without Midtrans configured, but must not be exposed as
 * the real checkout path once a gateway is wired up (anyone with a
 * valid session could "buy" an item for free by calling this).
 *
 * Body: {
 *   productId, paymentMethod, matchScore,
 *   shippingName, shippingPhone, shippingAddress
 * }
 *
 * Finalizes a purchase: verifies the caller still holds a valid
 * lock on the item, marks it sold, and creates the order record
 * shown in Dashboard → Riwayat Transaksi.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    productId,
    paymentMethod,
    matchScore,
    shippingName,
    shippingPhone,
    shippingAddress,
  } = await req.json();

  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const { data: product, error: fetchError } = await supabaseServer
    .from("products")
    .select("id, is_sold, hold_until, held_by")
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

  const { error: updateError } = await supabaseServer
    .from("products")
    .update({ is_sold: true, hold_until: null })
    .eq("id", productId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: order, error: orderError } = await supabaseServer
    .from("orders")
    .insert({
      user_id: user.id,
      product_id: productId,
      match_score: matchScore ?? null,
      payment_method: paymentMethod ?? null,
      status: "paid",
      shipping_name: shippingName ?? null,
      shipping_phone: shippingPhone ?? null,
      shipping_address: shippingAddress ?? null,
    })
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  return NextResponse.json({ order }, { status: 201 });
}
