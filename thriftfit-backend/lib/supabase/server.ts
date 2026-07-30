import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client — uses the SERVICE ROLE key and
// bypasses Row Level Security. This must only ever be imported
// inside app/api/**/route.ts files, which run on the server.
// Never import this into a component or expose it to the browser.
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Verifies the Supabase access token sent as `Authorization: Bearer <token>`
 * and returns the authenticated user, or null if missing/invalid.
 *
 * Route handlers should use this — not a client-supplied `userId` field —
 * to decide whose rows to read/write. Because these routes use the
 * service role key (which bypasses RLS), a userId taken from the
 * request body/query would let anyone read or write anyone else's
 * data just by sending a different UUID. Deriving the id from a
 * verified token closes that gap.
 */
export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
