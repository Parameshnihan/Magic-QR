import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, feedbackTable, clientsTable } from "@workspace/db";
import {
  ListFeedbackQueryParams,
  GetFeedbackParams,
  UpdateFeedbackParams,
  UpdateFeedbackBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/feedback", async (req, res): Promise<void> => {
  const params = ListFeedbackQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.success && params.data.clientId) {
    conditions.push(eq(feedbackTable.clientId, params.data.clientId));
  }
  if (params.success && params.data.priority) {
    conditions.push(eq(feedbackTable.priority, params.data.priority));
  }
  if (params.success && params.data.status) {
    conditions.push(eq(feedbackTable.status, params.data.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const feedbackList = await db.select().from(feedbackTable).where(where).orderBy(feedbackTable.createdAt).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(feedbackTable).where(where);

  const clients = await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable);
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  res.json({
    data: feedbackList.map(f => ({ ...f, clientName: clientMap[f.clientId] ?? "Unknown" })),
    total: Number(count),
    page,
    limit,
  });
});

router.get("/feedback/:id", async (req, res): Promise<void> => {
  const params = GetFeedbackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db.select().from(feedbackTable).where(eq(feedbackTable.id, params.data.id));
  if (!item) {
    res.status(404).json({ error: "Feedback not found" });
    return;
  }

  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, item.clientId));
  res.json({ ...item, clientName: client?.name ?? "Unknown" });
});

router.patch("/feedback/:id", async (req, res): Promise<void> => {
  const params = UpdateFeedbackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateFeedbackBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [item] = await db.update(feedbackTable).set(body.data).where(eq(feedbackTable.id, params.data.id)).returning();
  if (!item) {
    res.status(404).json({ error: "Feedback not found" });
    return;
  }

  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, item.clientId));
  res.json({ ...item, clientName: client?.name ?? "Unknown" });
});

export default router;
