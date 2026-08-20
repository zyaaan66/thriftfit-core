import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Lazily creates the Stripe client on first use instead of at module
 * import time. Next.js statically analyzes API routes during
 * `next build` ("Collecting page data"), which imports this file —
 * if `new Stripe(...)` ran at the top level, a missing/empty
 * STRIPE_SECRET_KEY at that point would crash the build itself,
 * even though the real value is present at runtime.
 */
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key, {
      apiVersion: "2026-07-29.dahlia",
    });
  }
  return _stripe;
}

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
  const stripe = getStripe();

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

/**
 * Exposes the lazily-created Stripe client for other modules that
 * need it directly (e.g. the webhook route, for signature
 * verification via getStripe().webhooks.constructEvent).
 */
export { getStripe };
