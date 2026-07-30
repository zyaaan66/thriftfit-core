import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { fitMatchScore } from "@/lib/fit-score";
import type { Product, ProductWithFitScore } from "@/types/database.types";

/**
 * GET /api/products
 *
 * Query params (all optional):
 *   chestMin, chestMax     — cm range on chest_width_cm
 *   lengthMin, lengthMax   — cm range on length_cm
 *   grade                  — comma-separated list, e.g. "A+,A"
 *   targetChest, targetLength — if provided, response is sorted by
 *                               Fit-Match score (best match first) and
 *                               each item includes `fit_match_score`.
 *   includeSold            — "true" to include sold items (default: excluded)
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const chestMin = params.get("chestMin");
  const chestMax = params.get("chestMax");
  const lengthMin = params.get("lengthMin");
  const lengthMax = params.get("lengthMax");
  const grade = params.get("grade");
  const targetChest = params.get("targetChest");
  const targetLength = params.get("targetLength");
  const includeSold = params.get("includeSold") === "true";

  let query = supabaseServer.from("products").select("*");

  if (!includeSold) query = query.eq("is_sold", false);
  if (chestMin) query = query.gte("chest_width_cm", Number(chestMin));
  if (chestMax) query = query.lte("chest_width_cm", Number(chestMax));
  if (lengthMin) query = query.gte("length_cm", Number(lengthMin));
  if (lengthMax) query = query.lte("length_cm", Number(lengthMax));
  if (grade) query = query.in("condition_grade", grade.split(","));

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let products: ProductWithFitScore[] = data as Product[];

  // If the person supplied a target size, compute + sort by Fit-Match score.
  // (For a very large catalog, prefer the `fit_match_score()` SQL function
  // in supabase/schema.sql and order in the query itself instead.)
  if (targetChest && targetLength) {
    const tChest = Number(targetChest);
    const tLength = Number(targetLength);
    products = products
      .map((p) => ({
        ...p,
        fit_match_score: fitMatchScore(p.chest_width_cm, p.length_cm, tChest, tLength),
      }))
      .sort((a, b) => (b.fit_match_score ?? 0) - (a.fit_match_score ?? 0));
  }

  return NextResponse.json({ products });
}
