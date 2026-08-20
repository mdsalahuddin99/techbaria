/**
 * One-time script: Reduce ১০০০ টাকা from customer 01711374429 (GSM Sumon) due.
 * Reason: ভুল এন্ট্রি correction — directly reduces `due` without any invoice.
 * 
 * Usage: npx tsx scripts/reduce-due-1000.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const PHONE = "01711374429";
  const AMOUNT = 1000;

  // 1. Find customer
  const customer = await prisma.customer.findFirst({
    where: { phone: PHONE, deletedAt: null },
    select: { id: true, name: true, phone: true, due: true, balance: true },
  });

  if (!customer) {
    console.error(`❌ Customer with phone ${PHONE} not found!`);
    process.exit(1);
  }

  const currentDue = Number(customer.due);
  const currentBalance = Number(customer.balance);
  const newDue = currentDue - AMOUNT;

  console.log(`\n📋 Customer: ${customer.name} (${customer.phone})`);
  console.log(`   Current Due: ৳${currentDue}`);
  console.log(`   Reducing:    ৳${AMOUNT}`);
  console.log(`   New Due:     ৳${newDue}\n`);

  if (newDue < 0) {
    console.warn(`⚠️  Warning: New due will be negative (${newDue}). Proceeding anyway...`);
  }

  // 2. Atomic transaction: reduce due + record ledger entry
  await prisma.$transaction(async (tx) => {
    // Reduce the due
    await tx.customer.update({
      where: { id: customer.id },
      data: { due: newDue },
    });

    // Record adjustment in customer ledger for audit trail
    await tx.customerTransaction.create({
      data: {
        customerId: customer.id,
        type: "ADJUSTMENT",
        amount: -AMOUNT, // negative = reducing due
        balanceBefore: currentBalance,
        balanceAfter: currentBalance, // wallet balance unchanged
        reference: `DUE-CORRECTION-${Date.now()}`,
        notes: `ভুল এন্ট্রি সংশোধন: ৳${AMOUNT} ডিউ থেকে কমানো হয়েছে (due: ${currentDue} → ${newDue})`,
        createdById: null,
      },
    });
  });

  console.log(`✅ Done! Due reduced from ৳${currentDue} to ৳${newDue}`);
  console.log(`   A ledger entry has been recorded for audit trail.`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
