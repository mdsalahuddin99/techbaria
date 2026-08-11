import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const models = Prisma.dmmf.datamodel.models;
  const backupData: Record<string, any> = {};

  console.log('Starting data export...');

  for (const model of models) {
    const modelName = model.name;
    // Lowercase first letter for prisma client access
    const delegate = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    
    try {
      // @ts-ignore
      const data = await prisma[delegate].findMany();
      backupData[modelName] = data;
      console.log(`Exported ${data.length} records from ${modelName}`);
    } catch (e) {
      console.error(`Error exporting ${modelName}:`, e);
    }
  }

  fs.writeFileSync('backup.json', JSON.stringify(backupData, null, 2));
  console.log('Successfully saved to backup.json');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
