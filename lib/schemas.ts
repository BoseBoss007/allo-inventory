import { z } from "zod";

export const ReserveSchema = z.object({
  inventoryId: z.string().min(1, "inventoryId is required"),
  quantity: z.number().int().positive("quantity must be a positive integer"),
});

export type ReserveInput = z.infer<typeof ReserveSchema>;
