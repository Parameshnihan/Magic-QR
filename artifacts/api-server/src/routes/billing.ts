import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, subscriptionsTable, invoicesTable, clientsTable } from "@workspace/db";
import {
  ListSubscriptionsQueryParams,
  CreateSubscriptionBody,
  GetSubscriptionParams,
  UpdateSubscriptionParams,
  UpdateSubscriptionBody,
  ListInvoicesQueryParams,
  CreateInvoiceBody,
  GetInvoiceParams,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
} from "@workspace/api-zod";
import { nanoid } from "nanoid";

const router: IRouter = Router();

// ─── Subscriptions ───

router.get("/subscriptions", async (req, res): Promise<void> => {
  const params = ListSubscriptionsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.success && params.data.clientId) {
    conditions.push(eq(subscriptionsTable.clientId, params.data.clientId));
  }
  if (params.success && params.data.status) {
    conditions.push(eq(subscriptionsTable.status, params.data.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const subs = await db.select().from(subscriptionsTable).where(where).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(subscriptionsTable).where(where);

  const clients = await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable);
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  res.json({
    data: subs.map(s => ({ ...s, clientName: clientMap[s.clientId] ?? "Unknown" })),
    total: Number(count),
    page,
    limit,
  });
});

router.post("/subscriptions", async (req, res): Promise<void> => {
  const parsed = CreateSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [sub] = await db.insert(subscriptionsTable).values({ ...parsed.data, autoRenew: parsed.data.autoRenew ?? true }).returning();
  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, sub.clientId));
  res.status(201).json({ ...sub, clientName: client?.name ?? "Unknown" });
});

router.get("/subscriptions/:id", async (req, res): Promise<void> => {
  const params = GetSubscriptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, params.data.id));
  if (!sub) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }

  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, sub.clientId));
  res.json({ ...sub, clientName: client?.name ?? "Unknown" });
});

router.patch("/subscriptions/:id", async (req, res): Promise<void> => {
  const params = UpdateSubscriptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateSubscriptionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [sub] = await db.update(subscriptionsTable).set(body.data).where(eq(subscriptionsTable.id, params.data.id)).returning();
  if (!sub) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }

  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, sub.clientId));
  res.json({ ...sub, clientName: client?.name ?? "Unknown" });
});

// ─── Invoices ───

router.get("/invoices", async (req, res): Promise<void> => {
  const params = ListInvoicesQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.success && params.data.clientId) {
    conditions.push(eq(invoicesTable.clientId, params.data.clientId));
  }
  if (params.success && params.data.status) {
    conditions.push(eq(invoicesTable.status, params.data.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const invoices = await db.select().from(invoicesTable).where(where).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(invoicesTable).where(where);

  const clients = await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable);
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  res.json({
    data: invoices.map(i => ({ ...i, clientName: clientMap[i.clientId] ?? "Unknown" })),
    total: Number(count),
    page,
    limit,
  });
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const invoiceNumber = `INV-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;
  const [invoice] = await db.insert(invoicesTable).values({ ...parsed.data, invoiceNumber }).returning();
  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, invoice.clientId));
  res.status(201).json({ ...invoice, clientName: client?.name ?? "Unknown" });
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, invoice.clientId));
  res.json({ ...invoice, clientName: client?.name ?? "Unknown" });
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateInvoiceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [invoice] = await db.update(invoicesTable).set(body.data).where(eq(invoicesTable.id, params.data.id)).returning();
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, invoice.clientId));
  res.json({ ...invoice, clientName: client?.name ?? "Unknown" });
});

export default router;
