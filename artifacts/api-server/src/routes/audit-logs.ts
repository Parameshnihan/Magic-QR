import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, auditLogsTable } from "@workspace/db";
import { ListAuditLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/audit-logs", async (req, res): Promise<void> => {
  const params = ListAuditLogsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.success && params.data.userId) {
    conditions.push(eq(auditLogsTable.userId, params.data.userId));
  }
  if (params.success && params.data.action) {
    conditions.push(ilike(auditLogsTable.action, `%${params.data.action}%`));
  }
  if (params.success && params.data.entity) {
    conditions.push(eq(auditLogsTable.entity, params.data.entity));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const logs = await db.select().from(auditLogsTable).where(where).orderBy(auditLogsTable.createdAt).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogsTable).where(where);

  res.json({ data: logs, total: Number(count), page, limit });
});

export default router;
