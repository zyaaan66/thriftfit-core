import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  // Throwing at import time would break `next build` type-checking on
  // machines without the env var set locally; check lazily instead.
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

/**
 * Creates a Stripe Checkout Session and returns the hosted payment
 * page URL. The frontend just redirects the browser there — no
 * client-side token/SDK call needed (unlike Midtrans Snap).
 */
export async function createCheckoutSession(params: {
  orderId: string;
  grossAmount: number; // in IDR (whole rupiah, not cents)
  productTitle: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "idr",
          product_data: { name: params.productTitle },
          // Stripe wants IDR in the smallest unit too, but IDR has
          // no decimal subunit in Stripe's model — pass the whole number.
          unit_amount: Math.round(params.grossAmount),
        },
        quantity: 1,
      },
    ],
    customer_email: params.customerEmail,
    // order.id is stored in metadata so the webhook can find it later
    metadata: { orderId: params.orderId },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");

  return { url: session.url, sessionId: session.id };
}