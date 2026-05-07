import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import {
  ListNotificationsQueryParams,
  MarkNotificationReadParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getUserIdFromToken(authHeader?: string): number | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.substring(7);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const id = parseInt(decoded.split(":")[0], 10);
    return isNaN(id) ? null : id;
  } catch {
    return null;
  }
}

router.get("/notifications", async (req, res): Promise<void> => {
  const params = ListNotificationsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const userId = getUserIdFromToken(req.headers.authorization);
  const conditions = [];
  if (userId) {
    conditions.push(eq(notificationsTable.userId, userId));
  }
  if (params.success && params.data.read !== undefined) {
    conditions.push(eq(notificationsTable.read, params.data.read));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const notifications = await db.select().from(notificationsTable).where(where).orderBy(notificationsTable.createdAt).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(notificationsTable).where(where);
  const [{ unread }] = await db.select({ unread: sql<number>`count(*)` }).from(notificationsTable).where(
    userId ? and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)) : eq(notificationsTable.read, false)
  );

  res.json({ data: notifications, total: Number(count), unreadCount: Number(unread), page, limit });
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [notification] = await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, params.data.id)).returning();
  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json(notification);
});

router.patch("/notifications/read-all", async (req, res): Promise<void> => {
  const userId = getUserIdFromToken(req.headers.authorization);
  if (userId) {
    await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.userId, userId));
  }

  res.json({ success: true, message: "All notifications marked as read" });
});

export default router;
