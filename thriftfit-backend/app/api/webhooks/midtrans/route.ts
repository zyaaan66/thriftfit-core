import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyMidtransSignature } from "@/lib/midtrans";

/**
 * POST /api/webhooks/midtrans
 *
 * Configure this URL in your Midtrans dashboard as the payment
 * notification endpoint. No user auth here — Midtrans calls this
 * server-to-server — but the signature check below is what stops
 * a forged request from marking an unpaid order as paid.
 *
 * This is the ONLY place that flips `orders.status` to "paid" and
 * `products.is_sold` to true. The client never gets to do that
 * directly, which is the whole point of routing payment through a
 * real gateway instead of trusting a "Bayar Sekarang" button.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = body;

  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return NextResponse.json({ error: "Malformed notification" }, { status: 400 });
  }

  const validSignature = verifyMidtransSignature(order_id, status_code, gross_amount, signature_key);
  if (!validSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const { data: order, error: fetchError } = await supabaseServer
    .from("orders")
    .select("id, product_id, status")
    .eq("id", order_id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const isSuccessful =
    transaction_status === "capture"
      ? fraud_status === "accept"
      : transaction_status === "settlement";

  if (isSuccessful && order.status === "pending") {
    await supabaseServer.from("orders").update({ status: "paid" }).eq("id", order.id);
    await supabaseServer
      .from("products")
      .update({ is_sold: true, hold_until: null })
      .eq("id", order.product_id);
  } else if (["deny", "cancel", "expire"].includes(transaction_status)) {
    await supabaseServer.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    // Release the hold so the item goes back on sale for other buyers.
    await supabaseServer
      .from("products")
      .update({ hold_until: null, held_by: null })
      .eq("id", order.product_id);
  }

  // Midtrans just needs a 200 response — it doesn't read the body.
  return NextResponse.json({ received: true });
}
