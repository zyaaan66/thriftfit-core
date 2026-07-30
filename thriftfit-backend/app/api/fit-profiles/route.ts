import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, getUserFromRequest } from "@/lib/supabase/server";

/**
 * GET /api/fit-profiles
 * Requires: Authorization: Bearer <supabase access token>
 * Lists the authenticated user's saved fit profiles.
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseServer
    .from("user_fit_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data });
}

/**
 * POST /api/fit-profiles
 * Requires: Authorization: Bearer <supabase access token>
 * Body: { profileName, targetChestCm, targetLengthCm, fitPreference }
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { profileName, targetChestCm, targetLengthCm, fitPreference } = body;

  if (!targetChestCm || !targetLengthCm) {
    return NextResponse.json(
      { error: "targetChestCm and targetLengthCm are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseServer
    .from("user_fit_profiles")
    .insert({
      user_id: user.id,
      profile_name: profileName || "Default",
      target_chest_cm: targetChestCm,
      target_length_cm: targetLengthCm,
      fit_preference: fitPreference || "Regular",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data }, { status: 201 });
}
