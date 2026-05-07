import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, reviewsTable, clientsTable } from "@workspace/db";
import {
  ListReviewsQueryParams,
  GetReviewParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reviews", async (req, res): Promise<void> => {
  const params = ListReviewsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.success && params.data.clientId) {
    conditions.push(eq(reviewsTable.clientId, params.data.clientId));
  }
  if (params.success && params.data.campaignId) {
    conditions.push(eq(reviewsTable.campaignId, params.data.campaignId));
  }
  if (params.success && params.data.rating) {
    conditions.push(eq(reviewsTable.rating, params.data.rating));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const reviews = await db.select().from(reviewsTable).where(where).orderBy(reviewsTable.createdAt).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(reviewsTable).where(where);

  const clients = await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable);
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  res.json({
    data: reviews.map(r => ({ ...r, clientName: clientMap[r.clientId] ?? "Unknown" })),
    total: Number(count),
    page,
    limit,
  });
});

router.get("/reviews/:id", async (req, res): Promise<void> => {
  const params = GetReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, params.data.id));
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }

  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, review.clientId));
  res.json({ ...review, clientName: client?.name ?? "Unknown" });
});

export default router;
