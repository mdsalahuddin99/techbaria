import { prisma } from './src/server/db/client';
async function main() {
  const id = 'cmrltjctb001auef4sc76oz7x';
  const acc = await prisma.financialAccount.findUnique({ where: { id } });
  console.log('FinancialAccount:', acc);
}
main().catch(console.error).finally(() => prisma.$disconnect());
