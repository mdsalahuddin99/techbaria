import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log("Connecting to the database...");
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log("Connection successful!", result);
  } catch (error) {
    console.error("Connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
