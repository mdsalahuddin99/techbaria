import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const prisma = new PrismaClient();

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

async function main() {
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

  // ── Upsert User ──────────────────────────────────────────────────────
  const email = "onlinetaiba@gmail.com";
  const passwordHash = hashPassword("Mizan2026");
  
  // Check if user exists with this email or id
  const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
  
  if (existingUserByEmail) {
    // Update the existing user directly by email
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

  console.log("✅ Seed complete: default shop and owner user initialized.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
