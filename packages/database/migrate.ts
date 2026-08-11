import { PrismaClient, Prisma } from '@prisma/client';

const oldUrl = "postgresql://neondb_owner:npg_wuPZTA0X8Scj@ep-calm-cell-ath11nwt.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";
const newUrl = "postgresql://neondb_owner:npg_enB4sMX1ROmh@ep-ancient-rain-azu78naz-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const oldDb = new PrismaClient({ datasources: { db: { url: oldUrl } } });
const newDb = new PrismaClient({ datasources: { db: { url: newUrl } } });

async function migrate() {
  const models = Prisma.dmmf.datamodel.models;
  
  console.log("Starting data migration from US to Singapore (Multi-pass approach)...");
  
  const MAX_PASSES = 5;

  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    console.log(`\n--- PASS ${pass} ---`);
    let insertedInPass = 0;
    let errorsInPass = 0;

    for (const model of models) {
      const modelName = model.name;
      const delegate = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      
      try {
        // @ts-ignore
        const data = await oldDb[delegate].findMany();
        if (data.length > 0) {
          // @ts-ignore
          const result = await newDb[delegate].createMany({
            data,
            skipDuplicates: true
          });
          if (result.count > 0) {
            console.log(`[${modelName}] Inserted ${result.count} records.`);
            insertedInPass += result.count;
          }
        }
      } catch (e) {
        errorsInPass++;
      }
    }

    console.log(`Pass ${pass} finished. Inserted: ${insertedInPass}, Errors: ${errorsInPass}`);
    if (insertedInPass === 0 && errorsInPass === 0) {
      break; // Everything done!
    }
  }

  console.log("\nMigration completed successfully! All data has been transferred.");
}

migrate()
  .catch(console.error)
  .finally(async () => {
    await oldDb.$disconnect();
    await newDb.$disconnect();
  });
