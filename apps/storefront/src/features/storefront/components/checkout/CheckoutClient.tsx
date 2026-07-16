"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight, ShieldCheck, Wallet, Smartphone, CreditCard } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import {
  useCartStore,
  useCartSubtotal,
  useCheckout,
} from "@/features/storefront";
import { CartSummary } from "@/features/storefront/components/cart/CartSummary";
import type { CheckoutAddress, ShippingMethod, StorefrontPaymentMethod } from "@/features/storefront/types";

export function CheckoutClient({ config }: { config: any }) {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartSubtotal();
  const { placeOrder, submitting } = useCheckout();

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

  const shippingMethods = config?.shippingMethods || [
    { id: "inside_dhaka", title: "Inside Dhaka", sub: "Delivery within 24 hours", price: 70 },
    { id: "outside_dhaka", title: "Outside Dhaka", sub: "2-3 business days", price: 130 },
    { id: "pickup", title: "Store Pickup", sub: "Pick up from our Dhaka store", price: 0 },
  ];

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>(shippingMethods[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState<StorefrontPaymentMethod>("cod");

  useEffect(() => {
    const data = localStorage.getItem("storefront_default_address");
    if (data) {
      try {
        setAddress((prev) => ({ ...prev, ...JSON.parse(data) }));
      } catch (e) { /* ignore */ }
    }
  }, []);

  const selectedShippingMethod = shippingMethods.find((m: any) => m.id === shippingMethod) || shippingMethods[0];
  const shipping = selectedShippingMethod ? Number(selectedShippingMethod.price) : 0;
  const total = subtotal + shipping;

  if (lines.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold mb-2 text-[#1E3A5F]">Cart is empty</h1>
        <Link href="/shop" className="font-bold text-[#16A34A] hover:text-[#15803D]">← Back to shop</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.fullName || !address.phone || !address.address) {
      toast.error("Please fill in required fields");
      return;
    }
    try {
      const order = await placeOrder({ address, shippingMethod, paymentMethod, shippingPrice: shipping });
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
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6 text-[#1E3A5F]">Checkout</h1>

      <div className="grid md:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Address */}
          <Section title="Delivery address">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Full name *" value={address.fullName} onChange={set("fullName")} />
              <Field label="Phone *" value={address.phone} onChange={set("phone")} type="tel" placeholder="01XXXXXXXXX" />
              {config?.requireEmail !== false && (
                <Field label="Email" value={address.email ?? ""} onChange={set("email")} type="email" className="sm:col-span-2" />
              )}
              <Field label="Address *" value={address.address} onChange={set("address")} className="sm:col-span-2" />
              {config?.showOrderNotes !== false && (
                <Field label="Order Notes" value={address.notes ?? ""} onChange={set("notes")} className="sm:col-span-2" placeholder="Any special instructions" />
              )}
            </div>
          </Section>

          {/* Shipping */}
          <Section title="Shipping method">
            <div className="space-y-2">
              {shippingMethods.map((m: any) => (
                <Radio
                  key={m.id}
                  checked={shippingMethod === m.id}
                  onChange={() => setShippingMethod(m.id)}
                  title={m.title}
                  sub={m.sub}
                  price={Number(m.price) > 0 ? `৳${m.price}` : "Free"}
                />
              ))}
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
          <div className="rounded-sm bg-white border border-[#E2E8F0] shadow-sm p-4">
            <div className="text-sm font-semibold mb-3 text-[#1E3A5F]">Order summary</div>
            <div className="space-y-2 max-h-60 overflow-y-auto text-xs text-slate-600">
              {lines.map((l) => (
                <div key={l.productId} className="flex items-center justify-between gap-2">
                  <span className="truncate">{l.name} × {l.qty}</span>
                  <span className="text-[#1E3A5F] font-semibold shrink-0">৳{(l.price * l.qty).toLocaleString("en-BD")}</span>
                </div>
              ))}
            </div>
          </div>
          <CartSummary subtotal={subtotal} shipping={shipping} total={total} />
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-[#16A34A] hover:bg-[#15803D] rounded-sm text-white shadow-md shadow-green-500/20 disabled:opacity-60"
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
    <section className="rounded-sm bg-white border border-[#E2E8F0] shadow-sm p-4 sm:p-5">
      <h2 className="text-base font-semibold mb-3 text-[#1E3A5F]">{title}</h2>
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
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#16A34A]/60 text-[#1E3A5F]"
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
      className={`w-full flex items-center gap-3 p-3 rounded-sm border transition text-left ${
        checked ? "border-[#16A34A]/40 bg-[#F0FDF4]" : "border-[#E2E8F0] hover:border-slate-300 bg-white"
      }`}
    >
      <div className={`h-4 w-4 rounded-sm border-2 grid place-items-center shrink-0 ${checked ? "border-[#16A34A]" : "border-slate-300"}`}>
        {checked && <span className="h-2 w-2 rounded-sm bg-[#16A34A]" />}
      </div>
      {Icon && <Icon className="h-5 w-5 text-[#16A34A] shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#1E3A5F]">{title}</div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
      {price && <div className="text-sm font-semibold text-[#1E3A5F] shrink-0">{price}</div>}
    </button>
  );
}
