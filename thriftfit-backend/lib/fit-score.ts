/**
 * Fit-Match Score Algorithm — from the ThriftFit blueprint, Fase 3.
 *
 *   ΔChest  = |Product.chest_width_cm − User.target_chest_cm|
 *   ΔLength = |Product.length_cm − User.target_length_cm|
 *   Score   = MAX(0, 100 − (ΔChest × 4.0) − (ΔLength × 2.5))
 *
 * Tolerance bands:
 *   > 85       → PERFECT FIT
 *   70–84      → SLIGHTLY OVERSIZED / RELAXED
 *   < 70       → NOT RECOMMENDED
 */
export function fitMatchScore(
  productChestCm: number,
  productLengthCm: number,
  targetChestCm: number,
  targetLengthCm: number
): number {
  const deltaChest = Math.abs(productChestCm - targetChestCm);
  const deltaLength = Math.abs(productLengthCm - targetLengthCm);
  const score = 100 - deltaChest * 4.0 - deltaLength * 2.5;
  return Math.max(0, Math.round(score * 10) / 10);
}

export type FitCategory = "PERFECT_FIT" | "RELAXED" | "NOT_RECOMMENDED";

export function fitCategory(score: number): FitCategory {
  if (score > 85) return "PERFECT_FIT";
  if (score >= 70) return "RELAXED";
  return "NOT_RECOMMENDED";
}
