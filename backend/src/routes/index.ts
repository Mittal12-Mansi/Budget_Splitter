import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import groupsRouter from "./groups.js";
import expensesRouter from "./expenses.js";
import balancesRouter from "./balances.js";
import settlementsRouter from "./settlements.js";
import dashboardRouter from "./dashboard.js";
import usersRouter from "./users.js";
import personalRouter from "./personal.js";
import recurringRouter from "./recurring.js";
import notificationsRouter from "./notifications.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/groups", groupsRouter);
router.use("/groups", expensesRouter);
router.use("/groups", recurringRouter);
router.use("/groups", balancesRouter);
router.use("/groups", settlementsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/users", usersRouter);
router.use("/personal", personalRouter);
router.use("/notifications", notificationsRouter);

export default router;
