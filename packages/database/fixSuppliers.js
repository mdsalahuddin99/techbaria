const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const suppliers = await prisma.supplier.findMany({
    where: {
      payable: { gt: 0 },
      advanceBalance: { gt: 0 },
    }
  });

  console.log(`Found ${suppliers.length} suppliers with both payable and advance.`);

  for (const supp of suppliers) {
    const amountToAdjust = Math.min(Number(supp.payable), Number(supp.advanceBalance));
    const newPayable = Number(supp.payable) - amountToAdjust;
    const newAdvance = Number(supp.advanceBalance) - amountToAdjust;

    await prisma.supplier.update({
      where: { id: supp.id },
      data: {
        payable: newPayable,
        advanceBalance: newAdvance,
      }
    });

    console.log(`Fixed supplier: ${supp.name} (ID: ${supp.id})`);
    console.log(`  - Old Payable: ${supp.payable}, Old Advance: ${supp.advanceBalance}`);
    console.log(`  - New Payable: ${newPayable}, New Advance: ${newAdvance}`);
  }
}

main().then(() => process.exit(0)).catch(console.error);
