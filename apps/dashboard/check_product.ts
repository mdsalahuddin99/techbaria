import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.product.update({
    where: { id: 'cmsumgl890001ueh0hiapf16p' },
    data: { trackSerials: false },
  });
  console.log('Updated:', updated.name, 'trackSerials:', updated.trackSerials);
}

main().catch(console.error).finally(() => prisma.$disconnect());
