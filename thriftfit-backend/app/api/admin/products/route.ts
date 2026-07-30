import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, getUserFromRequest } from "@/lib/supabase/server";

/**
 * POST /api/admin/products
 * Requires: Authorization: Bearer <supabase access token>, from a user
 * whose `user_metadata.role` is "admin" (set this manually for
 * trusted curators in the Supabase dashboard — there's no self-serve
 * signup path to becoming an admin).
 *
 * Body: {
 *   title, chestWidthCm, lengthCm, conditionGrade, conditionScore,
 *   price, era, material, imageUrls: string[]
 * }
 *
 * This is the second half of the image pipeline from Fase 5: the
 * frontend uploads photos directly to Cloudinary (unsigned upload
 * preset — see README "Image upload pipeline"), gets back secure_url
 * values, and calls this route with those URLs to actually list the
 * item. This route itself never touches image bytes.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    chestWidthCm,
    lengthCm,
    conditionGrade,
    conditionScore,
    price,
    era,
    material,
    imageUrls,
  } = body;

  if (!title || !chestWidthCm || !lengthCm || !conditionGrade || !price) {
    return NextResponse.json(
      { error: "title, chestWidthCm, lengthCm, conditionGrade, and price are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseServer
    .from("products")
    .insert({
      title,
      chest_width_cm: chestWidthCm,
      length_cm: lengthCm,
      condition_grade: conditionGrade,
      condition_score: conditionScore ?? null,
      price,
      era: era ?? null,
      material: material ?? null,
      image_urls: Array.isArray(imageUrls) ? imageUrls : [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data }, { status: 201 });
}
