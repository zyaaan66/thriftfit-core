import crypto from "crypto";

const MIDTRANS_BASE_URL =
  process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";

/**
 * Creates a Midtrans Snap transaction and returns { token, redirect_url }.
 * The `token` is what the frontend passes to `snap.pay(token, ...)`.
 *
 * This is a thin fetch wrapper instead of the `midtrans-client` SDK on
 * purpose — the SDK has no TypeScript types, and the Snap API is a
 * simple REST call, so this keeps `next build` type-checking clean.
 */
export async function createSnapTransaction(params: {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<{ token: string; redirect_url: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY is not configured");

  const auth = Buffer.from(`${serverKey}:`).toString("base64");

  const res = await fetch(`${MIDTRANS_BASE_URL}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.grossAmount,
      },
      customer_details: {
        first_name: params.customerName,
        email: params.customerEmail,
        phone: params.customerPhone,
      },
      // Matches the blueprint's "QRIS, E-Wallet, VA" payment options.
      enabled_payments: ["qris", "gopay", "shopeepay", "bca_va", "bni_va", "bri_va", "permata_va"],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_messages?.[0] || `Midtrans error ${res.status}`);
  }

  return res.json();
}

/**
 * Verifies a Midtrans webhook notification's signature so a forged
 * request can't be used to mark an item as sold without real payment.
 * See: https://docs.midtrans.com/docs/https-notification-webhook
 */
export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return false;
  const expected = crypto
    .createHash("sha512")
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest("hex");
  return expected === signatureKey;
}
