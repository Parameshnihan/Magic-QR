import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qrCampaignsTable = pgTable("qr_campaigns", {
  id: serial("id").primaryKey(),
  qrCode: text("qr_code").notNull().unique(),
  name: text("name").notNull(),
  clientId: integer("client_id").notNull(),
  destinationUrl: text("destination_url").notNull(),
  status: text("status").notNull().default("active"),
  totalScans: integer("total_scans").notNull().default(0),
  totalReviews: integer("total_reviews").notNull().default(0),
  conversionRate: real("conversion_rate").notNull().default(0),
  qrImageUrl: text("qr_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQrCampaignSchema = createInsertSchema(qrCampaignsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQrCampaign = z.infer<typeof insertQrCampaignSchema>;
export type QrCampaign = typeof qrCampaignsTable.$inferSelect;
