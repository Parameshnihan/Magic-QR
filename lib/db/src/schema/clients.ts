import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull().unique(),
  name: text("name").notNull(),
  businessName: text("business_name").notNull(),
  googleBusinessName: text("google_business_name"),
  businessCategory: text("business_category").notNull(),
  phone: text("phone").notNull(),
  whatsappNumber: text("whatsapp_number"),
  email: text("email").notNull(),
  address: text("address"),
  logoUrl: text("logo_url"),
  googleReviewLink: text("google_review_link"),
  recommendedKeywords: text("recommended_keywords").array().notNull().default([]),
  subscriptionPlan: text("subscription_plan").notNull().default("basic"),
  renewalDate: text("renewal_date"),
  assignedManagerId: integer("assigned_manager_id"),
  status: text("status").notNull().default("active"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  notes: text("notes"),
  customDomain: text("custom_domain"),
  totalScans: integer("total_scans").notNull().default(0),
  totalReviews: integer("total_reviews").notNull().default(0),
  positiveReviews: integer("positive_reviews").notNull().default(0),
  negativeReviews: integer("negative_reviews").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
