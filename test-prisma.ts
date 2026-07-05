import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const where: Prisma.ProductWhereInput = {
    OR: [
        { globalBrand: { is: { name: { contains: 'test', mode: 'insensitive' } } } },
        { globalModel: { is: { name: { contains: 'test', mode: 'insensitive' } } } }
    ]
};

console.log(where);
