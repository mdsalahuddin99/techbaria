/**
 * Translation dictionary. English keys map to localized strings.
 * Add a key here once and consume via `useT()`.
 */
export type Lang = "en" | "bn";

export const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "bn", label: "Bangla", native: "বাংলা" },
];

export const translations = {
  // Sidebar groups
  "nav.group.main": { en: "Home", bn: "হোম" },
  "nav.group.catalog": { en: "Stock", bn: "স্টক" },
  "nav.group.sales": { en: "Selling", bn: "বিক্রয়" },
  "nav.group.operations": { en: "Purchasing", bn: "ক্রয়" },
  "nav.group.insights": { en: "Manage", bn: "পরিচালনা" },
  "nav.group.storefront": { en: "Storefront", bn: "অনলাইন শপ" },
  "nav.group.commerce": { en: "Commerce", bn: "বিক্রয়" },
  "nav.group.ecommerce": { en: "E-Commerce", bn: "ই-কমার্স" },
  "nav.group.inventory": { en: "Inventory", bn: "ইনভেন্টরি" },
  "nav.group.people": { en: "Contacts", bn: "যোগাযোগ" },
  "nav.group.finance": { en: "Finance", bn: "অর্থায়ন" },
  "nav.group.system": { en: "System", bn: "সিস্টেম" },
  "nav.onlineOrders": { en: "Online Orders", bn: "অনলাইন অর্ডার" },
  "nav.storefrontCustomers": { en: "Users", bn: "ইউজার" },

  // Sidebar items
  "nav.dashboard": { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  "nav.pos": { en: "Create Sale", bn: "সেল তৈরি করুন" },
  "nav.products": { en: "Products", bn: "পণ্য" },
  "nav.categories": { en: "Categories", bn: "ক্যাটাগরি" },
  "nav.inventory": { en: "Inventory", bn: "ইনভেন্টরি" },
  "nav.restock": { en: "Restock Orders", bn: "রিস্টক অর্ডার" },
  "nav.transfers": { en: "Stock Transfers", bn: "স্টক ট্রান্সফার" },
  "nav.audit": { en: "Stock Audit", bn: "স্টক অডিট" },
  "nav.sales": { en: "Sales History", bn: "বিক্রয় হিসাব" },
  "nav.returns": { en: "Returns & Refunds", bn: "রিটার্ন ও ফেরত" },
  "nav.warrantyLookup": { en: "Warranty Lookup", bn: "ওয়ারেন্টি খুঁজুন" },
  "nav.customers": { en: "Customers", bn: "কাস্টমার" },
  "nav.purchases": { en: "Purchases", bn: "ক্রয়" },
  "nav.suppliers": { en: "Suppliers", bn: "সরবরাহকারী" },
  "nav.expenses": { en: "Expenses", bn: "খরচ" },
  "nav.accounts": { en: "Accounts", bn: "হিসাব" },
  "nav.dues": { en: "Dues", bn: "বাকির তালিকা" },
  "nav.reports": { en: "Reports", bn: "রিপোর্ট" },
  "nav.notifications": { en: "Notifications", bn: "নোটিফিকেশন" },
  "nav.settings": { en: "Settings", bn: "সেটিংস" },
  "nav.billing": { en: "Billing", bn: "বিলিং" },

  // Header
  "header.newSale": { en: "New Sale", bn: "নতুন বিক্রয়" },
  "header.openMenu": { en: "Open menu", bn: "মেনু খুলুন" },

  // Settings page
  "settings.title": { en: "Settings", bn: "সেটিংস" },
  "settings.description": {
    en: "Shop info, payment methods, loyalty and data backup.",
    bn: "দোকানের তথ্য, পেমেন্ট মাধ্যম, লয়ালটি ও ডেটা ব্যাকআপ।",
  },
  "settings.tab.shop": { en: "Shop", bn: "দোকান" },
  "settings.tab.receipt": { en: "Receipt", bn: "রসিদ" },
  "settings.tab.payments": { en: "Payments", bn: "পেমেন্ট" },
  "settings.tab.loyalty": { en: "Loyalty", bn: "লয়ালটি" },
  "settings.tab.data": { en: "Data", bn: "ডেটা" },
  "settings.language.title": { en: "Language", bn: "ভাষা" },
  "settings.language.description": {
    en: "Choose the interface language. Applies instantly across the app.",
    bn: "ইন্টারফেস ভাষা নির্বাচন করুন। অ্যাপজুড়ে সাথে সাথে প্রযোজ্য হবে।",
  },
  "settings.save": { en: "Save Changes", bn: "সেভ করুন" },

  // Labels (thermal print)
  "label.imei": { en: "IMEI", bn: "IMEI" },
  "label.serial": { en: "S/N", bn: "সিরিয়াল" },

  // Dues page
  "dues.title": { en: "Dues", bn: "বাকির তালিকা" },
  "dues.description": {
    en: "Sales with outstanding balance — partial or unpaid invoices.",
    bn: "যেসব বিক্রয়ে বাকি আছে — আংশিক বা অপরিশোধিত ইনভয়েস।",
  },
  "dues.totalDue": { en: "Total Due", bn: "মোট বাকি" },
  "dues.invoices": { en: "Invoices", bn: "ইনভয়েস" },
  "dues.customers": { en: "Customers", bn: "কাস্টমার" },
  "dues.list": { en: "Outstanding invoices", bn: "বাকির ইনভয়েস" },
  "dues.searchPlaceholder": {
    en: "Search invoice, customer, phone…",
    bn: "ইনভয়েস, কাস্টমার, ফোন খুঁজুন…",
  },
  "dues.empty.title": { en: "No dues", bn: "কোনো বাকি নেই" },
  "dues.empty.description": {
    en: "All invoices are fully paid.",
    bn: "সব ইনভয়েস সম্পূর্ণ পরিশোধিত।",
  },
  "dues.col.invoice": { en: "Invoice", bn: "ইনভয়েস" },
  "dues.col.date": { en: "Date", bn: "তারিখ" },
  "dues.col.customer": { en: "Customer", bn: "কাস্টমার" },
  "dues.col.total": { en: "Total", bn: "মোট" },
  "dues.col.paid": { en: "Paid", bn: "পরিশোধিত" },
  "dues.col.due": { en: "Due", bn: "বাকি" },
} as const;

export type TranslationKey = keyof typeof translations;
