import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  clientId: integer("client_id").notNull(),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  keywords: text("keywords").array().notNull().default([]),
  redirectedToGoogle: boolean("redirected_to_google").notNull().default(false),
  deviceType: text("device_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
