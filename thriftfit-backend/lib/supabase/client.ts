import { createClient } from "@supabase/supabase-js";

// Client-side Supabase client — uses the public anon key.
// All access through this client is subject to Row Level Security,
// so it's safe to use in browser components.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
