// This migration script has been commented out because the old relations
// (brandId, modelId, seriesId) have been removed from the Prisma schema
// after the data was successfully migrated.
// Leaving this here for reference only.

/*
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting catalog migration to global tables...");
  // ...
  console.log("Migration completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
*/
