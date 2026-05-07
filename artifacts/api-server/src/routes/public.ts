import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, qrCampaignsTable, clientsTable, reviewsTable, feedbackTable, scansTable, notificationsTable, usersTable } from "@workspace/db";
import {
  SubmitPublicReviewBody,
  RecordQrScanBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/public/review/:qrCode", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.qrCode) ? req.params.qrCode[0] : req.params.qrCode;

  const [campaign] = await db.select().from(qrCampaignsTable).where(eq(qrCampaignsTable.qrCode, raw));
  if (!campaign || campaign.status !== "active") {
    res.status(404).json({ error: campaign ? "This review page is temporarily unavailable." : "QR code not found" });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, campaign.clientId));
  if (!client || client.status !== "active") {
    res.status(404).json({ error: "This review page is temporarily unavailable." });
    return;
  }

  res.json({
    campaignId: campaign.id,
    clientId: client.id,
    businessName: client.businessName,
    logoUrl: client.logoUrl,
    recommendedKeywords: client.recommendedKeywords ?? [],
    businessCategory: client.businessCategory,
    isActive: true,
  });
});

router.post("/public/review/:qrCode/submit", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.qrCode) ? req.params.qrCode[0] : req.params.qrCode;

  const [campaign] = await db.select().from(qrCampaignsTable).where(eq(qrCampaignsTable.qrCode, raw));
  if (!campaign) {
    res.status(404).json({ error: "QR code not found" });
    return;
  }

  const body = SubmitPublicReviewBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { rating, reviewText, keywords, feedbackText, complaintCategory, customerName, customerPhone, customerEmail, deviceType } = body.data;

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, campaign.clientId));

  if (rating >= 4) {
    // Positive flow
    await db.insert(reviewsTable).values({
      campaignId: campaign.id,
      clientId: campaign.clientId,
      rating,
      reviewText: reviewText ?? null,
      keywords: keywords ?? [],
      redirectedToGoogle: true,
      deviceType: deviceType ?? null,
    });

    // Update campaign stats
    await db.update(qrCampaignsTable).set({
      totalReviews: campaign.totalReviews + 1,
      conversionRate: campaign.totalScans > 0 ? (campaign.totalReviews + 1) / campaign.totalScans : 0,
    }).where(eq(qrCampaignsTable.id, campaign.id));

    // Update client stats
    if (client) {
      await db.update(clientsTable).set({
        totalReviews: client.totalReviews + 1,
        positiveReviews: client.positiveReviews + 1,
      }).where(eq(clientsTable.id, client.id));

      // Notify admins
      const admins = await db.select().from(usersTable).where(eq(usersTable.role, "admin"));
      for (const admin of admins) {
        await db.insert(notificationsTable).values({
          userId: admin.id,
          title: "New Positive Review",
          message: `${client.businessName} received a ${rating}-star review`,
          type: "review",
          entityId: campaign.id,
          entityType: "campaign",
        });
      }
    }

    res.json({
      type: "positive",
      googleReviewUrl: client?.googleReviewLink ?? null,
      reviewText: reviewText ?? null,
      message: "Thank you for your review! You will be redirected to Google.",
    });
  } else {
    // Negative flow
    await db.insert(feedbackTable).values({
      campaignId: campaign.id,
      clientId: campaign.clientId,
      rating,
      feedbackText: feedbackText ?? null,
      complaintCategory: complaintCategory ?? null,
      customerName: customerName ?? null,
      customerPhone: customerPhone ?? null,
      customerEmail: customerEmail ?? null,
      deviceType: deviceType ?? null,
      priority: rating === 1 ? "urgent" : rating === 2 ? "high" : "medium",
      status: "new",
    });

    // Update client stats
    if (client) {
      await db.update(clientsTable).set({
        totalReviews: client.totalReviews + 1,
        negativeReviews: client.negativeReviews + 1,
      }).where(eq(clientsTable.id, client.id));

      // Notify admins and manager
      const notifyUsers = await db.select().from(usersTable).where(
        eq(usersTable.role, client.assignedManagerId ? "manager" : "admin")
      );

      for (const user of notifyUsers) {
        await db.insert(notificationsTable).values({
          userId: user.id,
          title: "Negative Feedback Alert",
          message: `${client.businessName} received a ${rating}-star rating. Immediate attention may be needed.`,
          type: "feedback",
          entityId: campaign.id,
          entityType: "campaign",
        });
      }
    }

    res.json({
      type: "negative",
      googleReviewUrl: null,
      reviewText: null,
      message: "Thank you for your feedback. We will work on improving your experience.",
    });
  }
});

router.post("/public/review/:qrCode/scan", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.qrCode) ? req.params.qrCode[0] : req.params.qrCode;

  const [campaign] = await db.select().from(qrCampaignsTable).where(eq(qrCampaignsTable.qrCode, raw));
  if (!campaign) {
    res.status(404).json({ error: "QR code not found" });
    return;
  }

  const body = RecordQrScanBody.safeParse(req.body);
  if (body.success) {
    await db.insert(scansTable).values({
      campaignId: campaign.id,
      clientId: campaign.clientId,
      deviceType: body.data.deviceType ?? null,
      userAgent: body.data.userAgent ?? null,
      location: body.data.location ?? null,
    });
  }

  await db.update(qrCampaignsTable).set({
    totalScans: campaign.totalScans + 1,
    conversionRate: campaign.totalReviews / (campaign.totalScans + 1),
  }).where(eq(qrCampaignsTable.id, campaign.id));

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, campaign.clientId));
  if (client) {
    await db.update(clientsTable).set({
      totalScans: client.totalScans + 1,
    }).where(eq(clientsTable.id, client.id));
  }

  res.json({ success: true, message: "Scan recorded" });
});

export default router;
