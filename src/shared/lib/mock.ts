import { CategoryRecord, Customer, Expense, Product, Sale, ShopSettings, Supplier } from "./types";
import { genInvoiceNo } from "./format";

// Helper to add new fields with sensible defaults
const wholesaleOf = (price: number) => Math.round(price * 0.9);

const baseProducts: Array<Omit<Product, "wholesalePrice" | "supplierId"> & { supplierId?: string }> = [
  // ===== CCTV Cameras (serialized — per-unit tracking) =====
  { id: "p1", name: "Hikvision 2MP Dome Camera DS-2CE56D0T", sku: "CAM-HIK-DM2", barcode: "8901201000001", category: "CCTV Camera", price: 1850, costPrice: 1450, stock: 25, minStock: 5, unit: "pcs", active: true, emoji: "📹", supplierId: "sup1", brand: "Hikvision", warrantyMonths: 24 },
  { id: "p2", name: "Hikvision 5MP Bullet Camera DS-2CE16H0T", sku: "CAM-HIK-BL5", barcode: "8901202000000", category: "CCTV Camera", price: 2950, costPrice: 2350, stock: 18, minStock: 5, unit: "pcs", active: true, emoji: "📹", supplierId: "sup1", brand: "Hikvision", warrantyMonths: 24 },
  { id: "p3", name: "Dahua 2MP IP Bullet Camera IPC-HFW1230S", sku: "CAM-DAH-IP2", barcode: "8901203000009", category: "CCTV Camera", price: 4200, costPrice: 3450, stock: 12, minStock: 3, unit: "pcs", active: true, emoji: "📹", supplierId: "sup2", brand: "Dahua", warrantyMonths: 24 },
  { id: "p4", name: "Dahua 4MP PTZ Camera SD22404T-GN", sku: "CAM-DAH-PTZ4", barcode: "8901204000008", category: "CCTV Camera", price: 28500, costPrice: 24500, stock: 4, minStock: 1, unit: "pcs", active: true, emoji: "📹", supplierId: "sup2", brand: "Dahua", warrantyMonths: 24 },
  { id: "p5", name: "Hikvision 4MP ColorVu Camera DS-2CD2047", sku: "CAM-HIK-CV4", barcode: "8901205000007", category: "CCTV Camera", price: 8500, costPrice: 7200, stock: 8, minStock: 2, unit: "pcs", active: true, emoji: "📹", supplierId: "sup1", brand: "Hikvision", warrantyMonths: 24 },
  { id: "p6", name: "Jovision 2MP Wi-Fi IP Camera JVS-H210", sku: "CAM-JOV-WF2", barcode: "8901206000006", category: "CCTV Camera", price: 2400, costPrice: 1850, stock: 20, minStock: 5, unit: "pcs", active: true, emoji: "📹", supplierId: "sup3", brand: "Jovision", warrantyMonths: 12 },

  // ===== DVR / NVR =====
  { id: "p7", name: "Hikvision 4-Ch Turbo HD DVR DS-7104HQHI", sku: "DVR-HIK-4CH", barcode: "8902201000008", category: "DVR / NVR", price: 6500, costPrice: 5400, stock: 10, minStock: 3, unit: "pcs", active: true, emoji: "🎛️", supplierId: "sup1", brand: "Hikvision", warrantyMonths: 24 },
  { id: "p8", name: "Hikvision 8-Ch Turbo HD DVR DS-7108HQHI", sku: "DVR-HIK-8CH", barcode: "8902202000007", category: "DVR / NVR", price: 9800, costPrice: 8200, stock: 7, minStock: 2, unit: "pcs", active: true, emoji: "🎛️", supplierId: "sup1", brand: "Hikvision", warrantyMonths: 24 },
  { id: "p9", name: "Hikvision 16-Ch Turbo DVR DS-7216HQHI", sku: "DVR-HIK-16CH", barcode: "8902203000006", category: "DVR / NVR", price: 16500, costPrice: 14200, stock: 4, minStock: 1, unit: "pcs", active: true, emoji: "🎛️", supplierId: "sup1", brand: "Hikvision", warrantyMonths: 24 },
  { id: "p10", name: "Dahua 8-Ch NVR NVR4108HS-4KS2", sku: "NVR-DAH-8CH", barcode: "8902204000005", category: "DVR / NVR", price: 11500, costPrice: 9800, stock: 5, minStock: 2, unit: "pcs", active: true, emoji: "🎛️", supplierId: "sup2", brand: "Dahua", warrantyMonths: 24 },

  // ===== Storage (HDD) =====
  { id: "p11", name: "WD Purple 1TB Surveillance HDD", sku: "HDD-WD-1TB", barcode: "8903201000005", category: "Storage", price: 5200, costPrice: 4400, stock: 15, minStock: 4, unit: "pcs", active: true, emoji: "💾", supplierId: "sup4", brand: "WD", warrantyMonths: 36 },
  { id: "p12", name: "WD Purple 2TB Surveillance HDD", sku: "HDD-WD-2TB", barcode: "8903202000004", category: "Storage", price: 7800, costPrice: 6600, stock: 10, minStock: 3, unit: "pcs", active: true, emoji: "💾", supplierId: "sup4", brand: "WD", warrantyMonths: 36 },
  { id: "p13", name: "Seagate SkyHawk 4TB HDD", sku: "HDD-SG-4TB", barcode: "8903203000003", category: "Storage", price: 14500, costPrice: 12500, stock: 6, minStock: 2, unit: "pcs", active: true, emoji: "💾", supplierId: "sup4", brand: "Seagate", warrantyMonths: 36 },

  // ===== Monitors =====
  { id: "p14", name: '19" CCTV LED Monitor HDMI/VGA', sku: "MON-19-LED", barcode: "8904201000002", category: "Monitor", price: 8500, costPrice: 7200, stock: 6, minStock: 2, unit: "pcs", active: true, emoji: "🖥️", supplierId: "sup3", brand: "Generic", warrantyMonths: 12 },
  { id: "p15", name: '22" Full HD CCTV Monitor', sku: "MON-22-FHD", barcode: "8904202000001", category: "Monitor", price: 12500, costPrice: 10800, stock: 4, minStock: 1, unit: "pcs", active: true, emoji: "🖥️", supplierId: "sup3", brand: "Generic", warrantyMonths: 12 },

  // ===== Power Supply =====
  { id: "p16", name: "12V 10A CCTV SMPS Power Supply", sku: "PWR-SMPS-10A", barcode: "8905201000009", category: "Power Supply", price: 950, costPrice: 650, stock: 30, minStock: 8, unit: "pcs", active: true, emoji: "🔌", supplierId: "sup5", brand: "Generic", warrantyMonths: 6 },
  { id: "p17", name: "12V 5A Adapter (Single Camera)", sku: "PWR-ADP-5A", barcode: "8905202000008", category: "Power Supply", price: 380, costPrice: 220, stock: 80, minStock: 20, unit: "pcs", active: true, emoji: "🔌", supplierId: "sup5", brand: "Generic", warrantyMonths: 3 },
  { id: "p18", name: "8-Ch Power Distribution Box", sku: "PWR-PDB-8CH", barcode: "8905203000007", category: "Power Supply", price: 1450, costPrice: 1050, stock: 18, minStock: 5, unit: "pcs", active: true, emoji: "🔌", supplierId: "sup5", brand: "Generic", warrantyMonths: 6 },

  // ===== Cables & Accessories (bulk / generic) =====
  { id: "p19", name: "RG59 + Power Coaxial Cable (per meter)", sku: "CBL-RG59-M", barcode: "8906201000006", category: "Cable", price: 35, costPrice: 22, stock: 1500, minStock: 200, unit: "m", active: true, emoji: "🧵", supplierId: "sup5", brand: "Generic" },
  { id: "p20", name: "CAT6 UTP Cable (per meter)", sku: "CBL-CAT6-M", barcode: "8906202000005", category: "Cable", price: 28, costPrice: 18, stock: 2000, minStock: 300, unit: "m", active: true, emoji: "🧵", supplierId: "sup5", brand: "Generic" },
  { id: "p21", name: "BNC Connector (Pack of 10)", sku: "ACC-BNC-10", barcode: "8907201000003", category: "Accessories", price: 220, costPrice: 130, stock: 60, minStock: 15, unit: "pcs", active: true, emoji: "🔧", supplierId: "sup5", brand: "Generic" },
  { id: "p22", name: "DC Power Connector (Pack of 10)", sku: "ACC-DC-10", barcode: "8907202000002", category: "Accessories", price: 180, costPrice: 100, stock: 70, minStock: 15, unit: "pcs", active: true, emoji: "🔧", supplierId: "sup5", brand: "Generic" },
  { id: "p23", name: "RJ45 Connector (Pack of 50)", sku: "ACC-RJ45-50", barcode: "8907203000001", category: "Accessories", price: 320, costPrice: 200, stock: 45, minStock: 10, unit: "pcs", active: true, emoji: "🔧", supplierId: "sup5", brand: "Generic" },
  { id: "p24", name: "PVC Casing (per meter)", sku: "ACC-PVC-M", barcode: "8907204000000", category: "Accessories", price: 18, costPrice: 10, stock: 1200, minStock: 200, unit: "m", active: true, emoji: "🔧", supplierId: "sup5", brand: "Generic" },
  { id: "p25", name: "PoE Switch 8-Port (For IP Cameras)", sku: "ACC-POE-8P", barcode: "8907205000009", category: "Accessories", price: 6500, costPrice: 5400, stock: 8, minStock: 2, unit: "pcs", active: true, emoji: "🔧", supplierId: "sup2", brand: "Dahua", warrantyMonths: 12 },
];

export const mockProducts: Product[] = baseProducts.map((p) => ({
  ...p,
  wholesalePrice: wholesaleOf(p.price),
}));

export const mockSuppliers: Supplier[] = [
  { id: "sup1", name: "Star Tech BD (Distributor)", contactPerson: "Mr. Karim", phone: "01711-100001", email: "sales@startech.bd", address: "Mohakhali, Dhaka", totalPurchased: 685000, payableBalance: 45000, createdAt: "2024-02-10T10:00:00Z" },
  { id: "sup2", name: "Apple Gadget World BD", contactPerson: "Mr. Rashid", phone: "01811-200002", email: "info@gadgetworld.bd", address: "Bashundhara, Dhaka", totalPurchased: 1240000, payableBalance: 120000, createdAt: "2024-03-05T10:00:00Z" },
  { id: "sup3", name: "Smart Computer Wholesale", contactPerson: "Ms. Shilpi", phone: "01911-300003", email: "supply@smartcom.bd", address: "Elephant Road, Dhaka", totalPurchased: 520000, payableBalance: 35000, createdAt: "2024-04-18T10:00:00Z" },
  { id: "sup4", name: "Audio Hub International", contactPerson: "Mr. Hossain", phone: "01611-400004", email: "audio@hubintl.bd", address: "Mirpur, Dhaka", totalPurchased: 156000, payableBalance: 0, createdAt: "2024-05-22T10:00:00Z" },
  { id: "sup5", name: "ElectroMax TV Distributors", contactPerson: "Mr. Anwar", phone: "01511-500005", email: "tv@electromax.bd", address: "Karwan Bazar, Dhaka", totalPurchased: 285000, payableBalance: 25000, createdAt: "2024-01-12T10:00:00Z" },
  { id: "sup6", name: "Mobile Accessories Hub", contactPerson: "Ms. Tanzila", phone: "01411-600006", email: "info@mobileacc.bd", address: "Gulistan, Dhaka", totalPurchased: 178000, payableBalance: 8500, createdAt: "2024-06-08T10:00:00Z" },
];

export const mockCustomers: Customer[] = [
  { id: "c1", name: "Walk-in Customer", phone: "—", group: "Regular", loyaltyPoints: 0, totalSpent: 0, createdAt: new Date().toISOString() },
  { id: "c2", name: "Rahim Uddin", phone: "01711-234567", email: "rahim@example.com", group: "Regular", loyaltyPoints: 120, totalSpent: 12450, createdAt: "2024-08-12T10:00:00Z" },
  { id: "c3", name: "Karim Ahmed", phone: "01811-345678", email: "karim@example.com", group: "Wholesale", loyaltyPoints: 540, totalSpent: 54200, createdAt: "2024-06-04T10:00:00Z" },
  { id: "c4", name: "Fatima Begum", phone: "01911-456789", group: "Regular", loyaltyPoints: 80, totalSpent: 8200, createdAt: "2024-09-01T10:00:00Z" },
  { id: "c5", name: "Abdul Hamid", phone: "01611-567890", email: "hamid@example.com", group: "Wholesale", loyaltyPoints: 1200, totalSpent: 124000, createdAt: "2024-03-22T10:00:00Z" },
  { id: "c6", name: "Sadia Rahman", phone: "01511-678901", group: "Regular", loyaltyPoints: 45, totalSpent: 4500, createdAt: "2024-10-15T10:00:00Z" },
  { id: "c7", name: "Imran Hossain", phone: "01411-789012", email: "imran@example.com", group: "Wholesale", loyaltyPoints: 380, totalSpent: 38900, createdAt: "2024-07-19T10:00:00Z" },
  { id: "c8", name: "Nasrin Akter", phone: "01311-890123", group: "Regular", loyaltyPoints: 60, totalSpent: 6100, createdAt: "2024-11-02T10:00:00Z" },
  { id: "c9", name: "Mizanur Rahman", phone: "01211-901234", email: "mizan@example.com", group: "Regular", loyaltyPoints: 95, totalSpent: 9800, createdAt: "2024-09-28T10:00:00Z" },
  { id: "c10", name: "Salma Khatun", phone: "01711-012345", group: "Wholesale", loyaltyPoints: 720, totalSpent: 72500, createdAt: "2024-05-10T10:00:00Z" },
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMockSales(): Sale[] {
  const sales: Sale[] = [];
  const methods: Array<"Cash" | "Card" | "Mobile Banking"> = ["Cash", "Card", "Mobile Banking"];
  let seq = 1;
  const today = new Date();

  for (let day = 29; day >= 0; day--) {
    const date = new Date(today);
    date.setDate(today.getDate() - day);
    const txnsToday = rand(2, 8);
    for (let t = 0; t < txnsToday; t++) {
      const itemCount = rand(1, 5);
      const items = [];
      const usedIds = new Set<string>();
      for (let i = 0; i < itemCount; i++) {
        let p = mockProducts[rand(0, mockProducts.length - 1)];
        while (usedIds.has(p.id)) p = mockProducts[rand(0, mockProducts.length - 1)];
        usedIds.add(p.id);
        items.push({ productId: p.id, name: p.name, price: p.price, qty: rand(1, 4) });
      }
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.05) : 0;
      const total = subtotal - discount;
      const method = methods[rand(0, 2)];
      const amountPaid = method === "Cash" ? Math.ceil(total / 50) * 50 : total;
      const customer = mockCustomers[rand(0, mockCustomers.length - 1)];
      const dt = new Date(date);
      dt.setHours(rand(9, 21), rand(0, 59));
      sales.push({
        id: `s${seq}`,
        invoiceNo: genInvoiceNo(seq),
        date: dt.toISOString(),
        customerId: customer.id,
        customerName: customer.name,
        items,
        subtotal,
        discount,
        total,
        paymentMethod: method,
        amountPaid,
        change: amountPaid - total,
        cashier: "Admin",
        editedBy: null,
        editedAt: null,
      });
      seq++;
    }
  }
  return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const mockCategories: CategoryRecord[] = [
  { id: "cat1", name: "CCTV Camera", parentId: null, order: 0 },
  { id: "cat1-1", name: "Hikvision", parentId: "cat1", order: 0 },
  { id: "cat1-2", name: "Dahua", parentId: "cat1", order: 1 },
  { id: "cat1-3", name: "Jovision", parentId: "cat1", order: 2 },
  { id: "cat2", name: "DVR / NVR", parentId: null, order: 1 },
  { id: "cat3", name: "Storage", parentId: null, order: 2 },
  { id: "cat4", name: "Monitor", parentId: null, order: 3 },
  { id: "cat5", name: "Power Supply", parentId: null, order: 4 },
  { id: "cat6", name: "Cable", parentId: null, order: 5 },
  { id: "cat7", name: "Accessories", parentId: null, order: 6 },
];

export function generateMockExpenses(): Expense[] {
  const cats: Expense["category"][] = ["Rent", "Salary", "Utilities", "Transport", "Marketing", "Maintenance", "Other"];
  const expenses: Expense[] = [];
  const today = new Date();
  // Last 60 days, ~1 expense per 3 days
  for (let day = 60; day >= 0; day -= 3) {
    const d = new Date(today);
    d.setDate(today.getDate() - day);
    const cat = cats[Math.floor(Math.random() * cats.length)];
    let amount = 0;
    let desc = "";
    switch (cat) {
      case "Rent": amount = 25000; desc = "Monthly shop rent"; break;
      case "Salary": amount = 15000 + Math.floor(Math.random() * 10000); desc = "Staff salary"; break;
      case "Utilities": amount = 2000 + Math.floor(Math.random() * 3000); desc = "Electricity / water bill"; break;
      case "Transport": amount = 500 + Math.floor(Math.random() * 1500); desc = "Goods transport"; break;
      case "Marketing": amount = 1000 + Math.floor(Math.random() * 4000); desc = "Promotion / signage"; break;
      case "Maintenance": amount = 800 + Math.floor(Math.random() * 2200); desc = "Equipment maintenance"; break;
      default: amount = 300 + Math.floor(Math.random() * 1700); desc = "Miscellaneous";
    }
    expenses.push({
      id: `exp${day}-${cat}`,
      date: d.toISOString(),
      category: cat,
      amount,
      description: desc,
      recordedBy: "Admin",
    });
  }
  return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const defaultSettings: ShopSettings = {
  shopName: "ShopFlow Mart",
  tagline: "POS & Inventory",
  logoUrl: "",
  address: "123 Main Road, Dhaka",
  phone: "01711-000000",
  email: "shop@shopflow.bd",
  website: "",
  currencySymbol: "৳",
  receiptFooter: "Thank you for shopping with us!",
  loyaltyEnabled: true,
  loyaltyPointsPerCurrency: 1, // 1 point per 100 BDT
  loyaltyRedeemRate: 1,        // 1 BDT per point
  paymentMethodsEnabled: { Cash: true, Card: true, "Mobile Banking": true, Due: true, Wallet: true },
  cloudinaryCloudName: "",
  cloudinaryUploadPreset: "",
  defaultReceiptMode: "ask",
  hapticFeedback: true,
};

