export type ConditionGrade = "A+" | "A" | "B" | "C";
export type FitPreference = "Slim" | "Regular" | "Boxy";
export type PaymentMethod = "QRIS" | "E-Wallet" | "VA";
export type OrderStatus = "pending" | "paid" | "shipped" | "completed" | "cancelled";

export interface Product {
  id: string;
  title: string;
  chest_width_cm: number;
  length_cm: number;
  condition_grade: ConditionGrade;
  condition_score: number | null;
  price: number;
  era: string | null;
  material: string | null;
  image_urls: string[] | null;
  is_sold: boolean;
  hold_until: string | null;
  held_by: string | null;
  created_at: string;
}

export interface ProductWithFitScore extends Product {
  fit_match_score?: number;
}

export interface UserFitProfile {
  id: string;
  user_id: string;
  profile_name: string;
  target_chest_cm: number;
  target_length_cm: number;
  fit_preference: FitPreference;
  created_at: string;
}

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  full_address: string;
  is_default: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  product_id: string;
  match_score: number | null;
  payment_method: PaymentMethod | null;
  status: OrderStatus;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  created_at: string;
}
