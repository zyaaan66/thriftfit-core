import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, getUserFromRequest } from "@/lib/supabase/server";

const HOLD_DURATION_MS = 15 * 60 * 1000; // 15 minutes, per Fase 5 spec

/**
 * POST /api/checkout/hold
 * Requires: Authorization: Bearer <supabase access token>
 * Body: { productId }
 *
 * Implements the "Pessimistic Locking / Cart Hold Timer (15 menit)"
 * requirement from Fase 5 — prevents two buyers from both checking
 * out the same 1-of-1 item at once.
 *
 * Returns 409 if the item is already sold or currently held by
 * someone else with an unexpired lock.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await req.json();
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const { data: product, error: fetchError } = await supabaseServer
    .from("products")
    .select("id, is_sold, hold_until, held_by")
    .eq("id", productId)
    .single();

  if (fetchError || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.is_sold) {
    return NextResponse.json(
      { error: "Item ini sudah terjual." },
      { status: 409 }
    );
  }

  const now = Date.now();
  const currentlyHeld =
    product.hold_until &&
    new Date(product.hold_until).getTime() > now &&
    product.held_by !== user.id;

  if (currentlyHeld) {
    return NextResponse.json(
      { error: "Item ini sedang dihold pembeli lain. Coba lagi nanti." },
      { status: 409 }
    );
  }

  const holdUntil = new Date(now + HOLD_DURATION_MS).toISOString();

  const { data: updated, error: updateError } = await supabaseServer
    .from("products")
    .update({ hold_until: holdUntil, held_by: user.id })
    .eq("id", productId)
    // Re-check is_sold in the same update to close the race window
    // between the read above and this write.
    .eq("is_sold", false)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "Gagal melakukan hold — item mungkin baru saja diambil pembeli lain." },
      { status: 409 }
    );
  }

  return NextResponse.json({ product: updated, holdUntil });
}
