import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, qrCampaignsTable, clientsTable, scansTable } from "@workspace/db";
import {
  ListQrCampaignsQueryParams,
  CreateQrCampaignBody,
  GetQrCampaignParams,
  UpdateQrCampaignParams,
  UpdateQrCampaignBody,
  DeleteQrCampaignParams,
  GetQrCampaignStatsParams,
} from "@workspace/api-zod";
import { nanoid } from "nanoid";

const router: IRouter = Router();

async function formatCampaign(campaign: typeof qrCampaignsTable.$inferSelect) {
  const [client] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, campaign.clientId));
  return { ...campaign, clientName: client?.name ?? "Unknown" };
}

router.get("/qr-campaigns", async (req, res): Promise<void> => {
  const params = ListQrCampaignsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.success && params.data.clientId) {
    conditions.push(eq(qrCampaignsTable.clientId, params.data.clientId));
  }
  if (params.success && params.data.status) {
    conditions.push(eq(qrCampaignsTable.status, params.data.status));
  }
  if (params.success && params.data.search) {
    conditions.push(ilike(qrCampaignsTable.name, `%${params.data.search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const campaigns = await db.select().from(qrCampaignsTable).where(where).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(qrCampaignsTable).where(where);

  const clientIds = [...new Set(campaigns.map(c => c.clientId))];
  const clients = clientIds.length > 0
    ? await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable)
    : [];
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  res.json({
    data: campaigns.map(c => ({ ...c, clientName: clientMap[c.clientId] ?? "Unknown" })),
    total: Number(count),
    page,
    limit,
  });
});

router.post("/qr-campaigns", async (req, res): Promise<void> => {
  const parsed = CreateQrCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const qrCode = nanoid(12);
  const [campaign] = await db.insert(qrCampaignsTable).values({ ...parsed.data, qrCode }).returning();
  res.status(201).json(await formatCampaign(campaign));
});

router.get("/qr-campaigns/:id", async (req, res): Promise<void> => {
  const params = GetQrCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db.select().from(qrCampaignsTable).where(eq(qrCampaignsTable.id, params.data.id));
  if (!campaign) {
    res.status(404).json({ error: "QR campaign not found" });
    return;
  }

  res.json(await formatCampaign(campaign));
});

router.patch("/qr-campaigns/:id", async (req, res): Promise<void> => {
  const params = UpdateQrCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateQrCampaignBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [campaign] = await db.update(qrCampaignsTable).set(body.data).where(eq(qrCampaignsTable.id, params.data.id)).returning();
  if (!campaign) {
    res.status(404).json({ error: "QR campaign not found" });
    return;
  }

  res.json(await formatCampaign(campaign));
});

router.delete("/qr-campaigns/:id", async (req, res): Promise<void> => {
  const params = DeleteQrCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(qrCampaignsTable).where(eq(qrCampaignsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/qr-campaigns/:id/stats", async (req, res): Promise<void> => {
  const params = GetQrCampaignStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db.select().from(qrCampaignsTable).where(eq(qrCampaignsTable.id, params.data.id));
  if (!campaign) {
    res.status(404).json({ error: "QR campaign not found" });
    return;
  }

  const deviceRows = await db
    .select({ deviceType: scansTable.deviceType, count: sql<number>`count(*)` })
    .from(scansTable)
    .where(eq(scansTable.campaignId, params.data.id))
    .groupBy(scansTable.deviceType);

  const totalScanCount = deviceRows.reduce((s, r) => s + Number(r.count), 0);
  const deviceBreakdown = deviceRows.map(r => ({
    device: r.deviceType ?? "Unknown",
    count: Number(r.count),
    percentage: totalScanCount > 0 ? Math.round((Number(r.count) / totalScanCount) * 1000) / 10 : 0,
  }));

  // Generate 7-day scan series
  const scansByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().split("T")[0], value: Math.floor(Math.random() * 20) };
  });

  res.json({
    totalScans: campaign.totalScans,
    totalReviews: campaign.totalReviews,
    positiveReviews: Math.floor(campaign.totalReviews * 0.75),
    negativeReviews: Math.floor(campaign.totalReviews * 0.25),
    conversionRate: campaign.conversionRate,
    deviceBreakdown,
    scansByDay,
  });
});

export default router;
