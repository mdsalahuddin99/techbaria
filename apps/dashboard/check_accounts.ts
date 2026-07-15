import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.financialAccount.findMany();
  console.log(accounts);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
