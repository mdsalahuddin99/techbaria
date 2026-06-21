export const runtime = "nodejs";

import { z } from "zod";
import { publicApiHandler, parseBody } from "@/server/lib/apiHandler";
import { salesService } from "@/server/services/salesService";

const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    qty: z.number().positive(),
  })).min(1, "At least one item is required"),
  discount: z.number().min(0).optional(),
  address: z.object({
    fullName: z.string().min(1, "Name is required"),
    phone: z.string().min(1, "Phone is required"),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    area: z.string().optional(),
    postcode: z.string().optional(),
    notes: z.string().optional(),
  }),
  shippingMethod: z.enum(["inside_dhaka", "outside_dhaka", "pickup"]),
  paymentMethod: z.enum(["cod", "bkash", "nagad", "card"]),
});

export const POST = publicApiHandler(async (shopId: string, req: Request) => {
  const body = await parseBody(req, checkoutSchema);
  return salesService.createStorefrontOrder(
    { userId: "", role: "CASHIER" },
    body,
  );
});
