import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
/**
 * POST /api/webhooks/stripe
 * Configure this URL in Stripe Dashboard → Developers → Webhooks,
 * listening for `checkout.session.completed` and
 * `checkout.session.expired`.
 *
 * Stripe requires the RAW request body (not parsed JSON) to verify
 * the signature — that's why this reads req.text() instead of req.json().
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature || "", webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const orderId = session.metadata?.orderId;
    if (!orderId) return NextResponse.json({ received: true });

    const { data: order } = await supabaseServer
      .from("orders")
      .select("id, product_id, status")
      .eq("id", orderId)
      .single();

    if (order && order.status === "pending") {
      await supabaseServer.from("orders").update({ status: "paid" }).eq("id", order.id);
      await supabaseServer
        .from("products")
        .update({ is_sold: true, hold_until: null })
        .eq("id", order.product_id);
    }
  } else if (event.type === "checkout.session.expired") {
    const session = event.data.object as any;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const { data: order } = await supabaseServer
        .from("orders")
        .select("id, product_id")
        .eq("id", orderId)
        .single();
      if (order) {
        await supabaseServer.from("orders").update({ status: "cancelled" }).eq("id", order.id);
        await supabaseServer
          .from("products")
          .update({ hold_until: null, held_by: null })
          .eq("id", order.product_id);
      }
    }
  }

  return NextResponse.json({ received: true });
}