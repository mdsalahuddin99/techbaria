"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ShieldCheck, Wallet, Smartphone, CreditCard } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import {
  useCartStore,
  useCartSubtotal,
  useCheckout,
  shippingCost,
  useSeo,
} from "@/features/storefront";
import { CartSummary } from "@/features/storefront/components/cart/CartSummary";
import type { CheckoutAddress, ShippingMethod, StorefrontPaymentMethod } from "@/features/storefront/types";

export default function StorefrontCheckout() {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartSubtotal();
  const { placeOrder, submitting } = useCheckout();
  useSeo({ title: "Checkout — AmarShop" });

  const [address, setAddress] = useState<CheckoutAddress>({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    area: "",
    postcode: "",
    notes: "",
  });
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("inside_dhaka");
  const [paymentMethod, setPaymentMethod] = useState<StorefrontPaymentMethod>("cod");

  const shipping = shippingCost(shippingMethod);
  const total = subtotal + shipping;

  if (lines.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold mb-2">Cart is empty</h1>
        <Link href="/storefront/shop" className="text-indigo-300 hover:text-indigo-200">← Back to shop</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.fullName || !address.phone || !address.address || !address.city) {
      toast.error("Please fill in required fields");
      return;
    }
    try {
      const order = await placeOrder({ address, shippingMethod, paymentMethod });
      toast.success("Order placed successfully!");
      router.push(`/storefront/order/${order.id}`);
    } catch (err) {
      toast.error("Failed to place order. Please try again.");
    }
  };

  const set = (k: keyof CheckoutAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setAddress((a) => ({ ...a, [k]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6">Checkout</h1>

      <div className="grid md:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Address */}
          <Section title="Delivery address">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Full name *" value={address.fullName} onChange={set("fullName")} />
              <Field label="Phone *" value={address.phone} onChange={set("phone")} type="tel" placeholder="01XXXXXXXXX" />
              <Field label="Email" value={address.email ?? ""} onChange={set("email")} type="email" className="sm:col-span-2" />
              <Field label="Address *" value={address.address} onChange={set("address")} className="sm:col-span-2" />
              <Field label="City *" value={address.city} onChange={set("city")} />
              <Field label="Area / Thana" value={address.area ?? ""} onChange={set("area")} />
              <Field label="Postcode" value={address.postcode ?? ""} onChange={set("postcode")} />
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Order notes</label>
                <textarea
                  value={address.notes}
                  onChange={set("notes")}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-card/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-400/60 text-white"
                />
              </div>
            </div>
          </Section>

          {/* Shipping */}
          <Section title="Shipping method">
            <div className="space-y-2">
              <Radio
                checked={shippingMethod === "inside_dhaka"}
                onChange={() => setShippingMethod("inside_dhaka")}
                title="Inside Dhaka"
                sub="Delivery within 24 hours"
                price="৳70"
              />
              <Radio
                checked={shippingMethod === "outside_dhaka"}
                onChange={() => setShippingMethod("outside_dhaka")}
                title="Outside Dhaka"
                sub="2-3 business days"
                price="৳130"
              />
              <Radio
                checked={shippingMethod === "pickup"}
                onChange={() => setShippingMethod("pickup")}
                title="Store Pickup"
                sub="Pick up from our Dhaka store"
                price="Free"
              />
            </div>
          </Section>

          {/* Payment */}
          <Section title="Payment method">
            <div className="space-y-2">
              <Radio
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
                title="Cash on Delivery"
                sub="Pay when you receive"
                icon={Wallet}
              />
              <Radio
                checked={paymentMethod === "bkash"}
                onChange={() => setPaymentMethod("bkash")}
                title="bKash"
                sub="Mobile banking"
                icon={Smartphone}
              />
              <Radio
                checked={paymentMethod === "nagad"}
                onChange={() => setPaymentMethod("nagad")}
                title="Nagad"
                sub="Mobile banking"
                icon={Smartphone}
              />
              <Radio
                checked={paymentMethod === "card"}
                onChange={() => setPaymentMethod("card")}
                title="Card"
                sub="Visa / Mastercard"
                icon={CreditCard}
              />
            </div>
          </Section>
        </div>

        <aside className="space-y-3 md:sticky md:top-20 md:self-start">
          <div className="rounded-2xl bg-card/[0.04] border border-white/10 p-4">
            <div className="text-sm font-semibold mb-3">Order summary</div>
            <div className="space-y-2 max-h-60 overflow-y-auto text-xs text-slate-300">
              {lines.map((l) => (
                <div key={l.productId} className="flex items-center justify-between gap-2">
                  <span className="truncate">{l.name} × {l.qty}</span>
                  <span className="text-white shrink-0">৳{(l.price * l.qty).toLocaleString("en-BD")}</span>
                </div>
              ))}
            </div>
          </div>
          <CartSummary subtotal={subtotal} shipping={shipping} total={total} />
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg shadow-indigo-600/30 disabled:opacity-60"
          >
            {submitting ? "Placing order..." : <>Place order <ArrowRight className="h-4 w-4 ml-1" /></>}
          </Button>
          <div className="text-[11px] text-slate-500 text-center inline-flex items-center gap-1.5 w-full justify-center">
            <ShieldCheck className="h-3 w-3" /> Secure checkout
          </div>
        </aside>
      </div>
      <div className="h-12" />
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card/[0.04] border border-white/10 p-4 sm:p-5">
      <h2 className="text-base font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label, value, onChange, type = "text", className = "", placeholder,
}: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; className?: string; placeholder?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-lg bg-card/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-400/60 text-white"
      />
    </div>
  );
}

function Radio({
  checked, onChange, title, sub, price, icon: Icon,
}: {
  checked: boolean; onChange: () => void; title: string; sub: string;
  price?: string; icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
        checked ? "border-indigo-400/60 bg-indigo-500/10" : "border-white/10 hover:border-white/20 bg-card/[0.02]"
      }`}
    >
      <div className={`h-4 w-4 rounded-full border-2 grid place-items-center shrink-0 ${checked ? "border-indigo-400" : "border-slate-500"}`}>
        {checked && <span className="h-2 w-2 rounded-full bg-indigo-400" />}
      </div>
      {Icon && <Icon className="h-5 w-5 text-indigo-300 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-xs text-slate-400">{sub}</div>
      </div>
      {price && <div className="text-sm font-semibold text-white shrink-0">{price}</div>}
    </button>
  );
}
