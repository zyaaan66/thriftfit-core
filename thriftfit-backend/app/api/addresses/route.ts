import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, getUserFromRequest } from "@/lib/supabase/server";

/**
 * GET /api/addresses
 * Requires: Authorization: Bearer <supabase access token>
 * Lists the authenticated user's saved addresses.
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseServer
    .from("user_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ addresses: data });
}

/**
 * POST /api/addresses
 * Requires: Authorization: Bearer <supabase access token>
 * Body: { label, recipientName, phone, fullAddress, isDefault }
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { label, recipientName, phone, fullAddress, isDefault } = body;

  if (!recipientName || !phone || !fullAddress) {
    return NextResponse.json(
      { error: "recipientName, phone, and fullAddress are required" },
      { status: 400 }
    );
  }

  if (isDefault) {
    await supabaseServer
      .from("user_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const { data, error } = await supabaseServer
    .from("user_addresses")
    .insert({
      user_id: user.id,
      label: label || "Rumah",
      recipient_name: recipientName,
      phone,
      full_address: fullAddress,
      is_default: !!isDefault,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ address: data }, { status: 201 });
}
