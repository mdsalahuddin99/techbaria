import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting role migration...");
  
  const result = await prisma.user.updateMany({
    where: {
      role: {
        in: ["SUPER_ADMIN", "OWNER", "MANAGER"] as any,
      },
    },
    data: {
      role: "ADMIN" as any,
    },
  });

  console.log(`Updated ${result.count} users to ADMIN role.`);
}

main()
  .catch((e) => {
    console.error("Error during migration:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
