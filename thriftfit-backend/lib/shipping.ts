/**
 * Shipping costs, keyed by courier name — matches the options shown
 * in the checkout UI. Kept server-side and looked up by courier name
 * only, so a tampered client request can never set an arbitrary
 * shipping cost (or gross_amount) for the payment gateway.
 */
export const SHIPPING_COSTS: Record<string, number> = {
  "JNE REG": 15000,
  "JNE YES (1 Hari)": 35000,
  "Instant (GoSend/Grab)": 25000,
};

export const DEFAULT_COURIER = "JNE REG";
