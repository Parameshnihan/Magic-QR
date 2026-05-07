import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  platformName: text("platform_name").notNull().default("ReviewFlow Pro"),
  platformLogo: text("platform_logo"),
  primaryColor: text("primary_color").notNull().default("#8B4A1F"),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  whatsappApiKey: text("whatsapp_api_key"),
  stripePublicKey: text("stripe_public_key"),
  razorpayKeyId: text("razorpay_key_id"),
  googleApiEnabled: boolean("google_api_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
