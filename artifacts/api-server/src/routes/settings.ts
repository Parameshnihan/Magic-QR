import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

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

export default router;
