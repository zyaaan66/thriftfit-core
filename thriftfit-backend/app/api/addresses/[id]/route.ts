import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, getUserFromRequest } from "@/lib/supabase/server";

/**
 * PATCH /api/addresses/:id
 * Requires: Authorization: Bearer <supabase access token>
 * Body: { isDefault: true }
 * Marks one address as the default; unsets it on the rest.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { isDefault } = await req.json();

  if (isDefault) {
    await supabaseServer
      .from("user_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const { data, error } = await supabaseServer
    .from("user_addresses")
    .update({ is_default: !!isDefault })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ address: data });
}

/**
 * DELETE /api/addresses/:id
 * Requires: Authorization: Bearer <supabase access token>
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabaseServer
    .from("user_addresses")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
