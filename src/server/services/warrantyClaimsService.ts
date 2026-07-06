import { prisma } from "@/server/db/client";
import type { Ctx } from "@/server/lib/ctx";
import type { WarrantyClaimCreateInput, WarrantyClaimUpdateInput } from "@/shared/validators/warrantyClaim";
import { ServiceError } from "@/server/lib/errors";

export const warrantyClaimsService = {
  async list(ctx: Ctx) {
    const claims = await prisma.warrantyClaim.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { id: true, name: true, sku: true, images: { take: 1 } } },
        customer: { select: { id: true, name: true, phone: true } },
        sale: { select: { id: true, createdAt: true, data: true } },
        supplier: { select: { id: true, name: true } },
      },
    });
    return claims.map(claim => ({
      ...claim,
      sale: claim.sale ? {
        id: claim.sale.id,
        invoiceNo: ((claim.sale.data as any)?.invoiceNo as string) || claim.sale.id.slice(0, 8).toUpperCase(),
        date: claim.sale.createdAt.toISOString(),
      } : null
    }));
  },

  async getById(ctx: Ctx, id: string) {
    const claim = await prisma.warrantyClaim.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        customer: { select: { id: true, name: true, phone: true } },
        sale: { select: { id: true, createdAt: true, data: true } },
        supplier: { select: { id: true, name: true } },
      },
    });
    if (!claim) throw new ServiceError("NOT_FOUND", "Warranty claim not found", 404);
    return {
      ...claim,
      sale: claim.sale ? {
        id: claim.sale.id,
        invoiceNo: ((claim.sale.data as any)?.invoiceNo as string) || claim.sale.id.slice(0, 8).toUpperCase(),
        date: claim.sale.createdAt.toISOString(),
      } : null
    };
  },

  async create(ctx: Ctx, data: WarrantyClaimCreateInput) {
    const count = await prisma.warrantyClaim.count();
    const claimNo = `RMA-${1001 + count}`; // Simple sequential number for now

    const claim = await prisma.warrantyClaim.create({
      data: {
        claimNo,
        type: data.type,
        productId: data.productId,
        serialNumber: data.serialNumber,
        customerId: data.customerId,
        saleId: data.saleId,
        supplierId: data.supplierId,
        issueDescription: data.issueDescription,
        status: "RECEIVED_FROM_CUSTOMER",
      },
    });
    
    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        entity: "WarrantyClaim",
        entityId: claim.id,
        action: "CREATE",
        diff: claim,
      }
    });

    return claim;
  },

  async update(ctx: Ctx, id: string, data: WarrantyClaimUpdateInput) {
    const existing = await this.getById(ctx, id);

    let statusUpdateData: any = {};
    if (data.status && data.status !== existing.status) {
      if (data.status === "SENT_TO_SUPPLIER") statusUpdateData.sentToSupplierAt = new Date();
      if (data.status === "RECEIVED_FROM_SUPPLIER") statusUpdateData.returnedAt = new Date();
      if (data.status === "RESOLVED" || data.status === "REJECTED") statusUpdateData.resolvedAt = new Date();
    }

    const claim = await prisma.warrantyClaim.update({
      where: { id },
      data: {
        status: data.status,
        supplierNotes: data.supplierNotes !== undefined ? data.supplierNotes : undefined,
        resolutionNote: data.resolutionNote !== undefined ? data.resolutionNote : undefined,
        customerCost: data.customerCost !== undefined ? data.customerCost : undefined,
        supplierCost: data.supplierCost !== undefined ? data.supplierCost : undefined,
        isCustomerPaid: data.isCustomerPaid !== undefined ? data.isCustomerPaid : undefined,
        ...statusUpdateData,
      },
    });

    // If resolving and there's an unpaid customer cost, we could theoretically add to customer due here,
    // but typically it's better to let the cashier handle it explicitly. 

    await prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        entity: "WarrantyClaim",
        entityId: claim.id,
        action: "UPDATE",
        diff: data,
      }
    });

    return claim;
  },

  async delete(ctx: Ctx, id: string) {
    const existing = await this.getById(ctx, id);
    await prisma.warrantyClaim.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        entity: "WarrantyClaim",
        entityId: id,
        action: "DELETE",
        diff: { deleted: true, claimNo: existing.claimNo },
      }
    });

    return true;
  },

  async lookupSale(ctx: Ctx, query: string) {
    const q = query.trim();
    if (!q) return null;

    // 1. Check if it's a serial number
    const serialDoc = await prisma.serialNumber.findUnique({
      where: { serial: q },
      include: {
        saleItem: {
          include: {
            sale: {
              include: {
                customer: true,
                items: {
                  include: {
                    product: { select: { name: true } },
                    serialNumbers: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (serialDoc?.saleItem?.sale) {
      const sale = serialDoc.saleItem.sale;
      return {
        type: "SERIAL",
        preSelectedSerial: q,
        preSelectedProductId: serialDoc.productId,
        sale: {
          id: sale.id,
          invoiceNo: ((sale.data as any)?.invoiceNo as string) || sale.id.slice(0, 8).toUpperCase(),
          date: sale.createdAt.toISOString(),
          customer: sale.customer ? { id: sale.customer.id, name: sale.customer.name, phone: sale.customer.phone } : null,
          items: sale.items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            productName: item.product.name,
            qty: item.qty,
            warrantyMonths: item.warrantyMonths,
            serialNumbers: item.serialNumbers.map((s: any) => ({
              serial: s.serial,
              warrantyExpiryDate: s.warrantyExpiryDate?.toISOString() || null
            }))
          }))
        }
      };
    }

    // 2. Fallback to searching by Sale ID
    const cleanId = q.toUpperCase().replace(/^INV-/, "").toLowerCase();
    const sales = await prisma.sale.findMany({
      where: {
        id: { startsWith: cleanId }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: { select: { name: true } },
            serialNumbers: true,
          }
        }
      },
      take: 1,
      orderBy: { createdAt: "desc" }
    });

    if (sales.length > 0) {
      const sale = sales[0];
      return {
        type: "INVOICE",
        sale: {
          id: sale.id,
          invoiceNo: ((sale.data as any)?.invoiceNo as string) || sale.id.slice(0, 8).toUpperCase(),
          date: sale.createdAt.toISOString(),
          customer: sale.customer ? { id: sale.customer.id, name: sale.customer.name, phone: sale.customer.phone } : null,
          items: sale.items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            productName: item.product.name,
            qty: item.qty,
            warrantyMonths: item.warrantyMonths,
            serialNumbers: item.serialNumbers.map((s: any) => ({
              serial: s.serial,
              warrantyExpiryDate: s.warrantyExpiryDate?.toISOString() || null
            }))
          }))
        }
      };
    }

    return null;
  }
};
