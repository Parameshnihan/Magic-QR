import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import clientsRouter from "./clients";
import qrCampaignsRouter from "./qr-campaigns";
import reviewsRouter from "./reviews";
import feedbackRouter from "./feedback";
import billingRouter from "./billing";
import notificationsRouter from "./notifications";
import analyticsRouter from "./analytics";
import auditLogsRouter from "./audit-logs";
import settingsRouter from "./settings";
import publicRouter from "./public";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(clientsRouter);
router.use(qrCampaignsRouter);
router.use(reviewsRouter);
router.use(feedbackRouter);
router.use(billingRouter);
router.use(notificationsRouter);
router.use(analyticsRouter);
router.use(auditLogsRouter);
router.use(settingsRouter);
router.use(publicRouter);
router.use(storageRouter);

export default router;
