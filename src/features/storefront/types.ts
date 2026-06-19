import type { Product } from "@/features/products/types";

export type StorefrontProduct = Product;

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  emoji: string;
  imageUrl?: string;
  qty: number;
  /** Snapshot of max stock at time of add — clamps qty stepper. */
  maxStock: number;
}

export interface CheckoutAddress {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  area?: string;
  postcode?: string;
  notes?: string;
}

export type ShippingMethod = "inside_dhaka" | "outside_dhaka" | "pickup";
export type StorefrontPaymentMethod = "cod" | "bkash" | "nagad" | "card";

export interface StorefrontOrder {
  id: string;
  orderNo: string;
  createdAt: string;
  items: CartLine[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  shippingMethod: ShippingMethod;
  paymentMethod: StorefrontPaymentMethod;
  address: CheckoutAddress;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
}

export type SortKey = "popular" | "newest" | "price_low" | "price_high";
