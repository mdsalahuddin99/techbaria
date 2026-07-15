import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const m = await prisma.model.create({
      data: {
        name: "TestModel123",
        productTypes: {
          create: []
        }
      }
    });
    console.log("Success:", m);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
