import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting product metadata migration...");
  const products = await prisma.product.findMany();
  let migratedCount = 0;

  for (const product of products) {
    if (!product.description) continue;

    try {
      const parsed = JSON.parse(product.description);
      if (parsed && typeof parsed === "object" && ("_m" in parsed || "_n" in parsed)) {
        const meta = (parsed._m as Record<string, any>) || {};
        const notes = (parsed._n as string) || "";

        const updateData: any = {};

        // Migrate warrantyMonths if not already set
        if (product.warrantyMonths === null && meta.warrantyMonths !== undefined) {
          updateData.warrantyMonths = Number(meta.warrantyMonths) || null;
        }

        // Migrate warrantyStartDate if not already set
        if (product.warrantyStartDate === null && meta.warrantyStartDate) {
          updateData.warrantyStartDate = new Date(meta.warrantyStartDate);
        }

        // Migrate trackSerials
        if (meta.trackSerials !== undefined) {
          updateData.trackSerials = meta.trackSerials === true || meta.trackSerials === "true";
        }

        // Update description to just be the notes string (or null if empty)
        updateData.description = notes ? notes : null;

        await prisma.product.update({
          where: { id: product.id },
          data: updateData,
        });

        console.log(`Migrated product ${product.id}`);
        migratedCount++;
      }
    } catch (err) {
      // Not JSON, ignore
    }
  }

  console.log(`Finished migrating ${migratedCount} products.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
