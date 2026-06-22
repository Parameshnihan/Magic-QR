import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { sql } from "drizzle-orm";
import nodemailer from "nodemailer";

const router: IRouter = Router();

router.get("/settings", async (req, res): Promise<void> => {
  const [settings] = await db.select().from(settingsTable);
  if (!settings) {
    const [created] = await db.insert(settingsTable).values({}).returning();
    res.json(created);
    return;
  }

  res.json(settings);
});

router.patch("/settings", async (req, res): Promise<void> => {
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select().from(settingsTable);
  if (!existing) {
    const [created] = await db.insert(settingsTable).values(body.data).returning();
    res.json(created);
    return;
  }

  const [updated] = await db.update(settingsTable).set(body.data).where(sql`id = ${existing.id}`).returning();
  res.json(updated);
});

router.post("/settings/test-email", async (req, res): Promise<void> => {
  const { toEmail } = req.body as { toEmail?: string };

  if (!toEmail) {
    res.status(400).json({ error: "toEmail is required" });
    return;
  }

  try {
    const [settings] = await db.select().from(settingsTable).limit(1);

    let transporter: nodemailer.Transporter;
    let usingEthereal = false;

    if (settings?.smtpHost && settings?.smtpUser && settings?.smtpPass) {
      transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort ?? 587,
        secure: (settings.smtpPort ?? 587) === 465,
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPass,
        },
      });
    } else {
      usingEthereal = true;
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const info = await transporter.sendMail({
      from: `"Advento Magic QR" <${settings?.smtpUser ?? "noreply@adventomagicqr.com"}>`,
      to: toEmail,
      subject: "Advento Magic QR — SMTP Test Email",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Georgia, serif; background: #F3EFEC; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 12px; max-width: 520px; margin: 0 auto; padding: 32px; border-top: 4px solid #8B4A1F; }
  .footer { text-align: center; font-size: 11px; color: #7A6F68; margin-top: 24px; }
</style></head>
<body>
<div class="card">
  <h2 style="color:#120700;margin:0 0 8px">SMTP Test Successful</h2>
  <p style="color:#7A6F68;margin:0 0 16px">Your email configuration is working correctly. Negative feedback from QR scans will be delivered to client email addresses.</p>
  <p style="color:#7A6F68;font-size:14px;margin:0">Sent at: ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</p>
  <div class="footer">Sent by Advento Magic QR &mdash; Do not reply to this message.</div>
</div>
</body>
</html>`,
      text: `SMTP Test Successful\n\nYour email configuration is working correctly. Negative feedback from QR scans will be delivered to client email addresses.\n\nSent at: ${new Date().toLocaleString()}`,
    });

    const previewUrl = usingEthereal ? (nodemailer.getTestMessageUrl(info) || null) : null;

    if (previewUrl) {
      req.log?.info({ previewUrl, to: toEmail }, "Test email sent via Ethereal — preview URL");
      console.log(`\n📧  TEST EMAIL PREVIEW (Ethereal): ${previewUrl}\n`);
    } else {
      req.log?.info({ to: toEmail, messageId: info.messageId }, "Test email sent via configured SMTP");
    }

    res.json({
      success: true,
      message: usingEthereal
        ? "Test email sent via Ethereal (no SMTP configured). Open the preview URL to view it."
        : `Test email delivered to ${toEmail} via your SMTP server.`,
      previewUrl,
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to send test email");
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Failed to send email: ${message}` });
  }
});

export default router;
