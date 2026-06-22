import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, qrCampaignsTable, clientsTable, reviewsTable, feedbackTable, scansTable, notificationsTable, usersTable, settingsTable } from "@workspace/db";
import {
  SubmitPublicReviewBody,
  RecordQrScanBody,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import nodemailer from "nodemailer";

const router: IRouter = Router();

// ── AI keyword + review template generator ─────────────────────────────────
router.post("/public/review/ai-keywords", async (req, res): Promise<void> => {
  const { businessName, businessCategory, rating } = req.body as {
    businessName: string;
    businessCategory?: string;
    rating: number;
  };

  if (!businessName || !rating) {
    res.status(400).json({ error: "businessName and rating are required" });
    return;
  }

  const fallback = {
    keywords: ["exceptional service", "highly recommend", "professional staff", "great experience", "exceeded expectations", "friendly team", "outstanding quality", "will return"],
    reviewTemplate: `${businessName} delivered an exceptional experience. The staff was professional and the quality was outstanding. Highly recommend to anyone looking for excellent service.`,
  };

  try {
    const prompt = `You are a Google review assistant. A customer gave ${rating} stars to "${businessName}"${businessCategory ? ` (a ${businessCategory})` : ""}.

Respond with a JSON object containing:
1. "keywords": an array of 8 short keyword phrases (2-5 words each) that are commonly mentioned in Google reviews for this type of business. These should be specific, authentic phrases customers actually write.
2. "reviewTemplate": a natural, positive ${rating}-star review (2-3 sentences) that uses some of the keywords. Write as a real customer. Vary the sentence opening - do not start with "I".

Respond ONLY with valid JSON. No markdown. No explanation. Example format:
{"keywords":["phrase one","phrase two"],"reviewTemplate":"The experience was great."}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 600,
      messages: [
        { role: "system", content: "You are a helpful assistant that responds only with valid JSON objects." },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    req.log?.info({ raw: raw.slice(0, 200) }, "AI raw response");

    if (!raw || raw.trim() === "") {
      req.log?.warn("AI returned empty content, using fallback");
      res.json(fallback);
      return;
    }

    // Extract JSON robustly — strip markdown fences if present
    const cleaned = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      req.log?.warn({ raw }, "No JSON found in AI response, using fallback");
      res.json(fallback);
      return;
    }

    const parsed = JSON.parse(jsonMatch[0]) as { keywords?: unknown; reviewTemplate?: unknown };

    const keywords = Array.isArray(parsed.keywords) && parsed.keywords.length > 0
      ? (parsed.keywords as string[]).slice(0, 8)
      : fallback.keywords;

    const reviewTemplate = typeof parsed.reviewTemplate === "string" && parsed.reviewTemplate.trim()
      ? parsed.reviewTemplate
      : fallback.reviewTemplate;

    res.json({ keywords, reviewTemplate });
  } catch (err) {
    req.log?.error({ err }, "AI keyword generation failed, using fallback");
    res.json(fallback);
  }
});

// ── Email helper ───────────────────────────────────────────────────────────
async function sendFeedbackEmail(opts: {
  toEmail: string;
  businessName: string;
  rating: number;
  feedbackText: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  clientSmtp?: { host?: string | null; port?: number | null; user?: string | null; pass?: string | null };
  log?: { info: (obj: unknown, msg?: string) => void; warn: (obj: unknown, msg?: string) => void; error: (obj: unknown, msg?: string) => void };
}) {
  const { toEmail, businessName, rating, feedbackText, customerName, customerPhone, customerEmail, clientSmtp, log } = opts;

  let transporter: nodemailer.Transporter;
  let fromAddress = "noreply@adventomagicqr.com";

  // Priority: client SMTP → global platform SMTP → Ethereal fallback
  if (clientSmtp?.host && clientSmtp?.user && clientSmtp?.pass) {
    const port = clientSmtp.port ?? 587;
    transporter = nodemailer.createTransport({
      host: clientSmtp.host,
      port,
      secure: port === 465,
      auth: { user: clientSmtp.user, pass: clientSmtp.pass },
    });
    fromAddress = clientSmtp.user;
  } else {
    const [settings] = await db.select().from(settingsTable).limit(1);
    if (settings?.smtpHost && settings?.smtpUser && settings?.smtpPass) {
      const port = settings.smtpPort ?? 587;
      transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port,
        secure: port === 465,
        auth: { user: settings.smtpUser, pass: settings.smtpPass },
      });
      fromAddress = settings.smtpUser;
    } else {
      // Fall back to Ethereal test account (captures email for preview in dev)
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    }
  }

  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const priorityLabel = rating === 1 ? "URGENT" : rating === 2 ? "HIGH PRIORITY" : "MEDIUM PRIORITY";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Georgia, serif; background: #F3EFEC; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 12px; max-width: 520px; margin: 0 auto; padding: 32px; border-top: 4px solid #8B4A1F; }
  .badge { display: inline-block; background: ${rating === 1 ? "#ef4444" : rating === 2 ? "#f97316" : "#eab308"}; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
  .stars { color: #f59e0b; font-size: 24px; margin: 12px 0; }
  .feedback { background: #F3EFEC; border-left: 3px solid #8B4A1F; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-style: italic; }
  .row { margin: 6px 0; font-size: 14px; color: #7A6F68; }
  .footer { text-align: center; font-size: 11px; color: #7A6F68; margin-top: 24px; }
</style></head>
<body>
<div class="card">
  <span class="badge">${priorityLabel}</span>
  <h2 style="color:#120700;margin:16px 0 4px">Negative Feedback Alert</h2>
  <p style="color:#7A6F68;margin:0 0 16px">${businessName} received a low-star review via the QR review link.</p>
  <div class="stars">${stars} (${rating}/5)</div>
  <div class="feedback">"${feedbackText}"</div>
  ${customerName ? `<div class="row"><strong>Customer:</strong> ${customerName}</div>` : ""}
  ${customerPhone ? `<div class="row"><strong>Phone:</strong> ${customerPhone}</div>` : ""}
  ${customerEmail ? `<div class="row"><strong>Email:</strong> ${customerEmail}</div>` : ""}
  <div class="row"><strong>Received:</strong> ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</div>
  <div class="footer">Sent by Advento Magic QR &mdash; Do not reply to this message.</div>
</div>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: `"Advento Magic QR" <${fromAddress}>`,
    to: toEmail,
    subject: `Advento Magic QR — [${priorityLabel}] ${rating}-Star Customer Feedback for ${businessName}`,
    html,
    text: `${priorityLabel}\n\n${businessName} received a ${rating}-star review.\n\nFeedback: "${feedbackText}"\n\nCustomer: ${customerName ?? "Anonymous"}\nPhone: ${customerPhone ?? "Not provided"}\nEmail: ${customerEmail ?? "Not provided"}`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    log?.info({ previewUrl, to: toEmail }, "Email sent (Ethereal test) — preview URL logged");
    console.log(`\n📧  EMAIL PREVIEW (Ethereal test): ${previewUrl}\n`);
  } else {
    log?.info({ to: toEmail, messageId: info.messageId }, "Feedback email sent via configured SMTP");
  }
}

// ── Get public review page ─────────────────────────────────────────────────
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

// ── Submit review or feedback ──────────────────────────────────────────────
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

    await db.update(qrCampaignsTable).set({
      totalReviews: campaign.totalReviews + 1,
      conversionRate: campaign.totalScans > 0 ? (campaign.totalReviews + 1) / campaign.totalScans : 0,
    }).where(eq(qrCampaignsTable.id, campaign.id));

    if (client) {
      await db.update(clientsTable).set({
        totalReviews: client.totalReviews + 1,
        positiveReviews: client.positiveReviews + 1,
      }).where(eq(clientsTable.id, client.id));

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
      message: "Thank you for your review!",
    });
  } else {
    // Negative flow — save feedback then email the client
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

    if (client) {
      await db.update(clientsTable).set({
        totalReviews: client.totalReviews + 1,
        negativeReviews: client.negativeReviews + 1,
      }).where(eq(clientsTable.id, client.id));

      const notifyUsers = await db.select().from(usersTable);
      const targets = notifyUsers.filter(u => u.role === "admin" || u.id === client.assignedManagerId);
      for (const user of targets) {
        await db.insert(notificationsTable).values({
          userId: user.id,
          title: "Negative Feedback Alert",
          message: `${client.businessName} received a ${rating}-star rating. Immediate attention may be needed.`,
          type: "feedback",
          entityId: campaign.id,
          entityType: "campaign",
        });
      }

      // Send email to the client's registered email
      if (client.email) {
        sendFeedbackEmail({
          toEmail: client.email,
          businessName: client.businessName,
          rating,
          feedbackText: feedbackText || "No additional comments provided.",
          customerName: customerName ?? null,
          customerPhone: customerPhone ?? null,
          customerEmail: customerEmail ?? null,
          clientSmtp: {
            host: client.smtpHost,
            port: client.smtpPort,
            user: client.smtpUser,
            pass: client.smtpPass,
          },
          log: req.log,
        }).catch((err) => req.log?.error({ err }, "Failed to send feedback email"));
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

// ── Record QR scan ─────────────────────────────────────────────────────────
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
