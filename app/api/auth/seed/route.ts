export const runtime = "nodejs";
import { prisma } from "@/server/db/client";
import { scryptSync, randomBytes } from "crypto";

const SCRYPT_PARAMS = "16384:8:1";
const KEY_LENGTH = 64;
const SALT_LENGTH = 32;

function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return `scrypt:${SCRYPT_PARAMS}:${salt}$${derivedKey.toString("hex")}`;
}

export async function GET() {
  try {
    const shopId = "cmq2fdepr0000uel0qfuj2vg7";
    const userId = "cmq2fdh4z0004uel0pq0fituq";
    
    // ── Upsert Shop ──────────────────────────────────────────────────────
    const existingShop = await prisma.shop.findUnique({ where: { id: shopId } });
    let shop;
    if (existingShop) {
      shop = existingShop;
    } else {
      shop = await prisma.shop.create({
        data: {
          id: shopId,
          name: "Taiba Shop",
          slug: "taiba-shop-" + Date.now(),
          currency: "BDT",
          timezone: "Asia/Dhaka",
        },
      });
    }

    // ── Upsert Owner User ────────────────────────────────────────────────
    const email = "onlinetaiba@gmail.com";
    const passwordHash = hashPassword("Mizan2026");
    
    const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
    
    if (existingUserByEmail) {
      await prisma.user.update({
        where: { email },
        data: { passwordHash }
      });
    } else {
      const existingUserById = await prisma.user.findUnique({ where: { id: userId } });
      if (existingUserById) {
        await prisma.user.update({
          where: { id: userId },
          data: { email, passwordHash }
        });
      } else {
        await prisma.user.create({
          data: {
            id: userId,
            name: "Owner Admin",
            email,
            role: "OWNER",
            passwordHash,
          },
        });
      }
    }

    // ── Upsert Warehouse ──────────────────────────────────────────────────
    await prisma.warehouse.upsert({
      where: { name: "HQ Warehouse" },
      update: {},
      create: {
        id: "seed-wh-hq",
        name: "HQ Warehouse",
        code: "HQ",
        isActive: true,
      },
    });

    // ── Financial Accounts ───────────────────────────────────────────────
    const accounts = [
      { name: "Cash Drawer", type: "CASH" },
      { name: "Bank Account", type: "BANK" },
      { name: "bKash", type: "MOBILE_BANKING" },
    ];

    for (const a of accounts) {
      await prisma.financialAccount.upsert({
        where: { id: `seed-acc-${a.type}` },
        update: {},
        create: { id: `seed-acc-${a.type}`, name: a.name, type: a.type as any, openingBalance: 0, balance: 0 },
      });
    }

    // ── Walk-in Customer ────────────────────────────────────────────────
    await prisma.customer.upsert({
      where: { id: "seed-cus-walk-in" },
      update: {},
      create: { id: "seed-cus-walk-in", name: "Walk-in Customer", phone: "01700000002" },
    });

    return Response.json({ success: true, message: "Essential database entities initialized successfully!" });
  } catch (error: any) {
    console.error("Seed route error:", error);
    return Response.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
