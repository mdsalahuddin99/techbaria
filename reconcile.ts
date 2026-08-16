import { PrismaClient } from '@prisma/client';
import * as math from './apps/dashboard/src/server/lib/math';

const prisma = new PrismaClient();

async function main() {
  const fix = process.argv.includes('--fix');
  
  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { due: { gt: 0 } },
          { sales: { some: { due: { gt: 0 } } } }
        ]
      },
      include: {
        sales: {
          where: { due: { gt: 0 }, status: "COMPLETED" },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    const mismatches = [];
    const fixed = [];

    for (const customer of customers) {
      const customerDue = Number(customer.due);
      const sumOfSaleDue = customer.sales.reduce((sum, s) => math.add(sum, Number(s.due)), 0);

      if (customerDue !== sumOfSaleDue) {
        mismatches.push({
          customerId: customer.id,
          name: customer.name,
          customerDue,
          sumOfSaleDue,
          difference: math.sub(sumOfSaleDue, customerDue)
        });

        if (fix && sumOfSaleDue > customerDue) {
          let excessToClear = math.sub(sumOfSaleDue, customerDue);
          
          await prisma.$transaction(async (tx) => {
            for (const sale of customer.sales) {
              if (excessToClear <= 0) break;
              
              const saleDue = Number(sale.due);
              const salePaid = Number(sale.paid);
              const clearAmount = Math.min(saleDue, excessToClear);
              
              const newDue = math.sub(saleDue, clearAmount);
              const newPaid = math.add(salePaid, clearAmount);
              
              await tx.sale.update({
                where: { id: sale.id },
                data: {
                  due: newDue,
                  paid: newPaid,
                  tenders: {
                    create: {
                      type: "CASH",
                      amount: clearAmount,
                      ref: "LEDGER-RECONCILE",
                    }
                  }
                }
              });
              
              excessToClear = math.sub(excessToClear, clearAmount);
            }
          });
          fixed.push(customer.id);
        }
      }
    }

    console.log(JSON.stringify({ 
      success: true, 
      mismatchesCount: mismatches.length,
      fixedCount: fixed.length,
      mismatches 
    }, null, 2));
  } catch (error: any) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
