# ThriftFit — Backend (Next.js 14 + Supabase)

> **Catatan: ini proyek pribadi/portofolio, bukan bisnis sungguhan.**
> Semua kredensial yang dipakai (Supabase free tier, Midtrans **sandbox**, dsb.) ditujukan untuk demo & pembelajaran — tidak ada transaksi uang asli, tidak ada badan usaha di baliknya. Foto produk pun placeholder/contoh, bukan barang yang benar-benar dijual. Kalau dipakai untuk portofolio (misal saat interview atau di CV), sebutkan konteks ini secara terbuka: ini demonstrasi kemampuan membangun sistem full-stack (auth, database, payment gateway, webhook security), bukan produk yang sedang berjalan secara komersial.

This implements the **Fase 3** architecture from the Master Blueprint: Next.js API routes backed by Supabase/PostgreSQL, including the Fit-Match Score algorithm and the 15-minute cart hold lock from the Fase 5 QA checklist.

## Setup

1. **Create a Supabase project** at supabase.com.
2. **Run the schema**: open the SQL editor in your Supabase dashboard and run `supabase/schema.sql`. This creates `products`, `user_fit_profiles`, `orders`, the `fit_match_score()` SQL function, and RLS policies.
3. **Copy environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Supabase → Project Settings → API.
4. **Install & run**:
   ```bash
   npm install
   npm run dev
   ```

## Routes implemented

| Route | Maps to blueprint |
|---|---|
| `GET /api/products` | Katalog & Filter (chest/length range, grade, `includeSold`) — pass `targetChest` + `targetLength` to get results sorted by Fit-Match score |
| `GET /api/products/:id` | Detail Produk (PDP) |
| `GET/POST /api/fit-profiles` · `DELETE /api/fit-profiles/:id` | Dashboard Member → Fit Profile Saver |
| `GET/POST /api/addresses` · `PATCH/DELETE /api/addresses/:id` | Dashboard address book + Checkout "Gunakan alamat tersimpan" |
| `POST /api/checkout/hold` | Checkout → Timer Hold Item (15 Menit), pessimistic locking |
| `POST /api/checkout/create-transaction` | Checkout → real payment entry point (creates a Midtrans Snap transaction) |
| `POST /api/webhooks/midtrans` | Midtrans notification webhook — the actual "mark it sold" trigger |
| `POST /api/checkout/complete` | ⚠️ demo-only direct finalize, superseded by the two rows above |
| `POST /api/admin/products` | Curator/admin — create a listing once photos are uploaded to Cloudinary |

## Fit-Match Score

Implemented identically in two places so you can pick whichever suits your scale:

- **`lib/fit-score.ts`** — plain JS/TS, used by `/api/products` today. Simple, but computes scores in the app layer after fetching rows.
- **`fit_match_score()`** SQL function in `supabase/schema.sql` — usable directly in a query (`order by fit_match_score(chest_width_cm, length_cm, :target_chest, :target_length)`) if your catalog grows large enough that in-app sorting gets expensive.

Formula (unchanged from the blueprint):

```
ΔChest  = |Product.chest_width_cm − target_chest_cm|
ΔLength = |Product.length_cm − target_length_cm|
Score   = MAX(0, 100 − (ΔChest × 4.0) − (ΔLength × 2.5))
```

`> 85` → Perfect Fit · `70–84` → Slightly Oversized/Relaxed · `< 70` → Not Recommended.

## Payment gateway (Midtrans)

The real checkout path is:

1. Frontend calls `POST /api/checkout/create-transaction` (needs a valid hold from `/api/checkout/hold` first). This creates an `orders` row with `status: "pending"` and asks Midtrans for a Snap `token`.
2. Frontend calls `snap.pay(token, ...)` (Midtrans' own JS, loaded via `https://app.sandbox.midtrans.com/snap/snap.js` with `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`) — this shows the actual QRIS/GoPay/VA payment UI.
3. Midtrans calls `POST /api/webhooks/midtrans` when the payment actually succeeds or fails. **This webhook — not the client — is what sets `orders.status = "paid"` and `products.is_sold = true`.**

Get sandbox keys at dashboard.sandbox.midtrans.com, set `MIDTRANS_SERVER_KEY` + `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` in `.env.local`, and register your webhook URL (e.g. `https://your-app.vercel.app/api/webhooks/midtrans`) in the Midtrans dashboard under Settings → Configuration.

`/api/checkout/complete` still exists for testing without Midtrans configured, but it trusts the client's word that payment happened — see the warning comment in that file. Don't use it as the real checkout path once Midtrans is wired up.

## Image upload pipeline

Two halves:

1. **Browser → Cloudinary directly** (no server involved, so large uploads don't hit your API routes). In Cloudinary: Settings → Upload → add an **unsigned** upload preset. Then from the frontend:
   ```js
   async function uploadToCloudinary(file) {
     const formData = new FormData();
     formData.append("file", file);
     formData.append("upload_preset", "YOUR_UNSIGNED_PRESET_NAME");
     const res = await fetch(`https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload`, {
       method: "POST",
       body: formData,
     });
     const data = await res.json();
     return data.secure_url; // WebP/AVIF delivery can be set on the preset itself
   }
   ```
2. **Cloudinary URL → your catalog**: once you have `secure_url` values, call `POST /api/admin/products` with them in `imageUrls`. That route requires the caller's Supabase user to have `user_metadata.role === "admin"` — set that manually per curator account in the Supabase dashboard (Authentication → Users → edit user → User Metadata), since there's no self-serve path to becoming an admin.

There's no upload UI built here — just the two working pieces above (the preset-based browser upload snippet, and the route that persists the resulting URLs). A real curator dashboard (drag-and-drop, preview, WebP compression settings) would be a separate frontend page, not something this backend package needs to provide.

## Security notes

- Every route below requires `Authorization: Bearer <supabase access token>` — each handler calls `supabaseServer.auth.getUser(token)` to find out who's calling, and uses **that** id for every read/write: `/api/addresses`, `/api/addresses/:id`, `/api/fit-profiles`, `/api/fit-profiles/:id`, `/api/checkout/hold`, `/api/checkout/create-transaction`, `/api/checkout/complete`. None of them take a `userId` field in the body/query; a client can only ever act as itself.
- `/api/webhooks/midtrans` is the one intentionally public route (Midtrans calls it server-to-server, with no user session) — it's protected instead by verifying the SHA-512 signature Midtrans sends, using your `MIDTRANS_SERVER_KEY`. Never skip that check.
- `/api/admin/products` requires a valid token **and** `user_metadata.role === "admin"` on that user — anyone else gets 403, even if logged in.
- `/api/products` and `/api/products/:id` are intentionally public (no auth required) — that's the catalog browsing experience.
- All API routes use the **service role key** server-side — this key must never reach the browser.
- Client components (e.g. a `"use client"` catalog page) should use `lib/supabase/client.ts` (anon key) for anything that doesn't need to bypass RLS, such as reading the public product list directly.
- `user_fit_profiles`, `user_addresses`, and `orders` are protected by RLS so a signed-in user can only read/write their own rows; `products` is the one table intentionally left without anon write policies, since holds/sales must go through the API routes.

## Not included (intentionally out of scope for this pass)

- Payment gateway webhook handlers for QRIS/E-Wallet/VA — `/api/checkout/complete` currently marks an order "paid" directly; in production you'd call this from a webhook after the gateway confirms payment, not directly from the client.
- Image upload pipeline (Cloudinary/S3 WebP compression from Fase 5) — `products.image_urls` is ready to receive the URLs once that pipeline exists; until then, the prototype falls back to placeholder photos.

## Connecting the HTML prototype

`thriftfit-prototype.html` is fully wired to this backend now. Fill in three constants near the top of its `<script>` block:

- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — switches login over to real Supabase Auth (sign up / sign in), so every user has a real UUID.
- `API_BASE` — the deployed/running URL of this Next.js project.

Once both are set: the catalog loads from `/api/products`, checkout holds/completes through `/api/checkout/hold` and `/api/checkout/complete` (with real 409 handling if someone else is holding the item or the hold expired), and the address book + Fit Profile Saver persist through their respective routes. Leave them blank and the file keeps working exactly as before, entirely in-memory — every API call has a local fallback, so there's no broken state either way.
