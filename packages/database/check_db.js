const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const id = 'cmrltjctb001auef4sc76oz7x';
  const acc = await prisma.financialAccount.findUnique({ where: { id } });
  console.log('Account exists?', !!acc);
  console.log('Account:', acc);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
