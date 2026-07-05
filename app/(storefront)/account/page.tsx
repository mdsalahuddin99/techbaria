"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  Package, ChevronRight, ShoppingBag, Loader2, User, Mail, 
  MapPin, Shield, LogOut, CheckCircle2 
} from "lucide-react";
import { formatPrice, useSeo } from "@/features/storefront";
import type { StorefrontOrder } from "@/features/storefront/types";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";

type Tab = "profile" | "address" | "orders" | "security";

export default function StorefrontAccount() {
  const { data: session, update: updateSession } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<StorefrontOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({ title: "My account — AmarShop" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/storefront/my-orders")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data)) setOrders(data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10 min-h-[50vh]">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6 text-[#1E3A5F]">My account</h1>
        <div className="text-center py-20 text-slate-500 text-sm">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#16A34A] mb-3" />
          Loading your dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10 mb-20">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E3A5F]">My account</h1>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="hidden md:flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="md:w-64 shrink-0">
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <TabButton active={activeTab === "orders"} onClick={() => setActiveTab("orders")} icon={Package}>
              My Orders
            </TabButton>
            <TabButton active={activeTab === "profile"} onClick={() => setActiveTab("profile")} icon={User}>
              Profile Info
            </TabButton>
            <TabButton active={activeTab === "address"} onClick={() => setActiveTab("address")} icon={MapPin}>
              Address Book
            </TabButton>
            <TabButton active={activeTab === "security"} onClick={() => setActiveTab("security")} icon={Shield}>
              Security
            </TabButton>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="md:hidden flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition whitespace-nowrap"
            >
              <LogOut className="h-5 w-5" /> Log out
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 sm:p-7 min-h-[400px]">
            {activeTab === "orders" && <OrdersTab orders={orders} />}
            {activeTab === "profile" && <ProfileTab session={session} updateSession={updateSession} />}
            {activeTab === "address" && <AddressTab />}
            {activeTab === "security" && <SecurityTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
        active 
          ? "bg-[#16A34A] text-white shadow-md shadow-green-600/20" 
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-white" : "text-slate-400"}`} />
      {children}
    </button>
  );
}

// ─── TABS ──────────────────────────────────────────────────────────────────

function OrdersTab({ orders }: { orders: StorefrontOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">No orders yet</h3>
        <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
          When you place an order, it will appear here so you can track its status.
        </p>
        <Link href="/shop" className="inline-flex items-center justify-center bg-[#16A34A] text-white px-6 py-2.5 rounded-full font-semibold hover:bg-[#15803D] transition shadow-md shadow-green-600/20">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-[#1E3A5F] mb-6">Order History</h2>
      <div className="space-y-4">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/storefront/order/${o.id}`}
            className="block border border-[#E2E8F0] rounded-xl p-4 sm:p-5 hover:border-[#16A34A]/50 hover:shadow-sm transition group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-base font-bold text-[#1E3A5F]">#{o.orderNo}</span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <span>{new Date(o.createdAt).toLocaleDateString("en-BD", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>{o.items.length} item{o.items.length > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-48">
                <div className="text-right">
                  <div className="text-xs text-slate-500 mb-0.5">Total</div>
                  <div className="text-base font-bold text-[#16A34A]">{formatPrice(o.total)}</div>
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-50 group-hover:bg-[#16A34A]/10 flex items-center justify-center transition shrink-0">
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[#16A34A]" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

function ProfileTab({ session, updateSession }: any) {
  const [name, setName] = useState(session?.user?.name || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    
    setLoading(true);
    try {
      const res = await fetch("/api/storefront/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      
      toast.success("Profile updated successfully");
      await updateSession(); // Refresh session in client
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-[#1E3A5F] mb-6">Profile Information</h2>
      
      <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div className="h-14 w-14 rounded-full bg-[#16A34A]/10 flex items-center justify-center shrink-0">
          <User className="h-6 w-6 text-[#16A34A]" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-700 truncate">{session?.user?.email}</div>
          <div className="text-xs text-slate-500">Registered Customer</div>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-md space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
          <input
            type="text"
            className="w-full h-11 px-4 border border-slate-300 rounded-xl focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] outline-none transition text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="h-11 px-6 bg-[#16A34A] text-white rounded-xl font-semibold text-sm hover:bg-[#15803D] transition disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

function AddressTab() {
  const [address, setAddress] = useState({
    fullName: "", phone: "", address: "", city: "", area: "", postcode: ""
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem("storefront_default_address");
    if (data) {
      try { setAddress(JSON.parse(data)); } catch (e) {}
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("storefront_default_address", JSON.stringify(address));
    setSaved(true);
    toast.success("Address saved to browser");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-[#1E3A5F] mb-2">Saved Address</h2>
      <p className="text-sm text-slate-500 mb-6">This address will be pre-filled during checkout to save your time.</p>
      
      <form onSubmit={handleSave} className="space-y-4 max-w-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input required type="text" className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
              value={address.fullName} onChange={e => setAddress({...address, fullName: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input required type="tel" className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
              value={address.phone} onChange={e => setAddress({...address, phone: e.target.value})} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Detailed Address (House, Road, etc.)</label>
          <textarea required className="w-full p-3 border border-slate-300 rounded-lg text-sm h-20 resize-none"
            value={address.address} onChange={e => setAddress({...address, address: e.target.value})} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City / District</label>
            <input required type="text" className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
              value={address.city} onChange={e => setAddress({...address, city: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Area / Thana</label>
            <input type="text" className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
              value={address.area} onChange={e => setAddress({...address, area: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Postcode</label>
            <input type="text" className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
              value={address.postcode} onChange={e => setAddress({...address, postcode: e.target.value})} />
          </div>
        </div>
        <div className="pt-2">
          <button type="submit" className="flex items-center justify-center gap-2 h-11 px-6 bg-[#16A34A] text-white rounded-xl font-semibold text-sm hover:bg-[#15803D] transition">
            {saved ? <><CheckCircle2 className="h-4 w-4" /> Saved!</> : "Save Default Address"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SecurityTab() {
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new.length < 6) return toast.error("New password must be at least 6 characters");
    if (passwords.new !== passwords.confirm) return toast.error("Passwords do not match");
    
    setLoading(true);
    try {
      const res = await fetch("/api/storefront/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          currentPassword: passwords.current,
          newPassword: passwords.new 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      
      toast.success("Password updated successfully");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-[#1E3A5F] mb-6">Security Settings</h2>
      <form onSubmit={handleSave} className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Current Password (if set)</label>
          <input
            type="password"
            className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
            value={passwords.current}
            onChange={e => setPasswords({...passwords, current: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
          <input
            required
            type="password"
            className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
            value={passwords.new}
            onChange={e => setPasswords({...passwords, new: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
          <input
            required
            type="password"
            className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
            value={passwords.confirm}
            onChange={e => setPasswords({...passwords, confirm: e.target.value})}
          />
        </div>
        <div className="pt-2">
          <button type="submit" disabled={loading} className="h-11 px-6 bg-[#16A34A] text-white rounded-xl font-semibold text-sm hover:bg-[#15803D] transition disabled:opacity-50">
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
