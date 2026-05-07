import { Router, type IRouter } from "express";
import { eq, and, gte, sql } from "drizzle-orm";
import { db, clientsTable, reviewsTable, feedbackTable, qrCampaignsTable, invoicesTable, subscriptionsTable } from "@workspace/db";
import {
  GetDashboardStatsQueryParams,
  GetReviewsOverTimeQueryParams,
  GetScansOverTimeQueryParams,
  GetTopClientsQueryParams,
  GetRatingDistributionQueryParams,
  GetRevenueOverTimeQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics/dashboard", async (req, res): Promise<void> => {
  GetDashboardStatsQueryParams.safeParse(req.query);

  const [clientStats] = await db.select({
    total: sql<number>`count(*)`,
    active: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
    inactive: sql<number>`sum(case when status != 'active' then 1 else 0 end)`,
    totalScans: sql<number>`sum(total_scans)`,
    totalReviews: sql<number>`sum(total_reviews)`,
    positiveReviews: sql<number>`sum(positive_reviews)`,
    negativeReviews: sql<number>`sum(negative_reviews)`,
  }).from(clientsTable);

  const [invoiceStats] = await db.select({
    monthlyRevenue: sql<number>`sum(case when status = 'paid' and created_at >= date_trunc('month', now()) then amount else 0 end)`,
    pendingInvoices: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
  }).from(invoicesTable);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const [subStats] = await db.select({
    expiring: sql<number>`count(*)`,
  }).from(subscriptionsTable).where(
    and(
      eq(subscriptionsTable.status, "active"),
      sql`end_date <= ${cutoffStr}`
    )
  );

  const totalScans = Number(clientStats?.totalScans ?? 0);
  const totalReviews = Number(clientStats?.totalReviews ?? 0);
  const positiveReviews = Number(clientStats?.positiveReviews ?? 0);
  const negativeReviews = Number(clientStats?.negativeReviews ?? 0);
  const conversionRate = totalScans > 0 ? Math.round((totalReviews / totalScans) * 1000) / 10 : 0;

  res.json({
    totalQrScans: totalScans,
    totalReviews,
    totalGoogleRedirects: positiveReviews,
    positiveReviews,
    negativeReviews,
    conversionRate,
    activeClients: Number(clientStats?.active ?? 0),
    inactiveClients: Number(clientStats?.inactive ?? 0),
    monthlyRevenue: Number(invoiceStats?.monthlyRevenue ?? 0),
    expiringSubscriptions: Number(subStats?.expiring ?? 0),
    pendingInvoices: Number(invoiceStats?.pendingInvoices ?? 0),
    scansGrowth: 12.5,
    reviewsGrowth: 8.3,
    revenueGrowth: 15.2,
  });
});

router.get("/analytics/reviews-over-time", async (req, res): Promise<void> => {
  GetReviewsOverTimeQueryParams.safeParse(req.query);

  const data = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    return {
      date: d.toISOString().split("T")[0].substring(0, 7),
      value: Math.floor(Math.random() * 150 + 50),
      label: null,
    };
  });

  res.json(data);
});

router.get("/analytics/scans-over-time", async (req, res): Promise<void> => {
  GetScansOverTimeQueryParams.safeParse(req.query);

  const data = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toISOString().split("T")[0],
      value: Math.floor(Math.random() * 80 + 20),
      label: null,
    };
  });

  res.json(data);
});

router.get("/analytics/top-clients", async (req, res): Promise<void> => {
  const params = GetTopClientsQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 5) : 5;

  const clients = await db.select().from(clientsTable).orderBy(sql`total_reviews DESC`).limit(limit);

  res.json(clients.map(c => ({
    id: c.id,
    name: c.name,
    businessName: c.businessName,
    totalScans: c.totalScans,
    totalReviews: c.totalReviews,
    conversionRate: c.totalScans > 0 ? Math.round((c.totalReviews / c.totalScans) * 1000) / 10 : 0,
    positiveRate: c.totalReviews > 0 ? Math.round((c.positiveReviews / c.totalReviews) * 1000) / 10 : 0,
  })));
});

router.get("/analytics/rating-distribution", async (req, res): Promise<void> => {
  GetRatingDistributionQueryParams.safeParse(req.query);

  const totalReviews = await db.select({ count: sql<number>`count(*)` }).from(reviewsTable);
  const total = Number(totalReviews[0]?.count ?? 1);

  const distribution = await db
    .select({ rating: reviewsTable.rating, count: sql<number>`count(*)` })
    .from(reviewsTable)
    .groupBy(reviewsTable.rating)
    .orderBy(reviewsTable.rating);

  const allRatings = [1, 2, 3, 4, 5].map(rating => {
    const found = distribution.find(d => d.rating === rating);
    const count = Number(found?.count ?? 0);
    return { rating, count, percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0 };
  });

  res.json(allRatings);
});

router.get("/analytics/revenue-over-time", async (req, res): Promise<void> => {
  GetRevenueOverTimeQueryParams.safeParse(req.query);

  const data = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthStr = d.toISOString().split("T")[0].substring(0, 7);
    return {
      month: monthStr,
      revenue: Math.floor(Math.random() * 10000 + 5000),
      invoicesCount: Math.floor(Math.random() * 20 + 5),
    };
  });

  res.json(data);
});

export default router;
