import { Router, type IRouter } from "express";
import { eq, ilike, or, and, sql, lte } from "drizzle-orm";
import { db, clientsTable, usersTable } from "@workspace/db";
import {
  ListClientsQueryParams,
  CreateClientBody,
  GetClientParams,
  UpdateClientParams,
  UpdateClientBody,
  DeleteClientParams,
  ToggleClientStatusParams,
  ToggleClientStatusBody,
  GetClientStatsParams,
  ListExpiringClientsQueryParams,
} from "@workspace/api-zod";
import { nanoid } from "nanoid";

const router: IRouter = Router();

function formatClient(client: typeof clientsTable.$inferSelect, managerName?: string | null) {
  return {
    ...client,
    assignedManagerName: managerName ?? null,
  };
}

router.get("/clients", async (req, res): Promise<void> => {
  const params = ListClientsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.success && params.data.status) {
    conditions.push(eq(clientsTable.status, params.data.status));
  }
  if (params.success && params.data.managerId) {
    conditions.push(eq(clientsTable.assignedManagerId, params.data.managerId));
  }
  if (params.success && params.data.search) {
    conditions.push(
      or(
        ilike(clientsTable.name, `%${params.data.search}%`),
        ilike(clientsTable.businessName, `%${params.data.search}%`),
        ilike(clientsTable.email, `%${params.data.search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const clients = await db.select().from(clientsTable).where(where).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(clientsTable).where(where);

  const managers = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.role, "manager"));
  const managerMap = Object.fromEntries(managers.map(m => [m.id, m.name]));

  res.json({
    data: clients.map(c => formatClient(c, c.assignedManagerId ? managerMap[c.assignedManagerId] : null)),
    total: Number(count),
    page,
    limit,
  });
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const clientId = `CLT-${nanoid(8).toUpperCase()}`;
  const [client] = await db.insert(clientsTable).values({ ...parsed.data, clientId }).returning();
  res.status(201).json(formatClient(client));
});

router.get("/clients/expiring", async (req, res): Promise<void> => {
  const params = ListExpiringClientsQueryParams.safeParse(req.query);
  const days = params.success ? (params.data.days ?? 30) : 30;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + days);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  const clients = await db.select().from(clientsTable)
    .where(and(
      eq(clientsTable.status, "active"),
      lte(clientsTable.renewalDate, cutoffStr)
    ));

  res.json(clients.map(c => formatClient(c)));
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  let managerName = null;
  if (client.assignedManagerId) {
    const [manager] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, client.assignedManagerId));
    managerName = manager?.name ?? null;
  }

  res.json(formatClient(client, managerName));
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateClientBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [client] = await db.update(clientsTable).set(body.data).where(eq(clientsTable.id, params.data.id)).returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json(formatClient(client));
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(clientsTable).where(eq(clientsTable.id, params.data.id));
  res.sendStatus(204);
});

router.patch("/clients/:id/toggle-status", async (req, res): Promise<void> => {
  const params = ToggleClientStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ToggleClientStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [client] = await db.update(clientsTable).set({ status: body.data.status }).where(eq(clientsTable.id, params.data.id)).returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json(formatClient(client));
});

router.get("/clients/:id/stats", async (req, res): Promise<void> => {
  const params = GetClientStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const conversionRate = client.totalScans > 0 ? (client.totalReviews / client.totalScans) * 100 : 0;
  const avgRating = client.totalReviews > 0
    ? ((client.positiveReviews * 4.5) + (client.negativeReviews * 2)) / client.totalReviews
    : 0;

  res.json({
    totalScans: client.totalScans,
    totalReviews: client.totalReviews,
    positiveReviews: client.positiveReviews,
    negativeReviews: client.negativeReviews,
    conversionRate: Math.round(conversionRate * 10) / 10,
    avgRating: Math.round(avgRating * 10) / 10,
    scansThisMonth: Math.floor(client.totalScans * 0.3),
    reviewsThisMonth: Math.floor(client.totalReviews * 0.3),
  });
});

export default router;
