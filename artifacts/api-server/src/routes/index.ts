import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import seasonsRouter from "./seasons";
import gpsRouter from "./gps";
import driversRouter from "./drivers";
import teamsRouter from "./teams";
import draftsRouter from "./drafts";
import leaguesRouter from "./leagues";
import friendsRouter from "./friends";
import scoresRouter from "./scores";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(seasonsRouter);
router.use(gpsRouter);
router.use(driversRouter);
router.use(teamsRouter);
router.use(draftsRouter);
router.use(leaguesRouter);
router.use(friendsRouter);
router.use(scoresRouter);
router.use(adminRouter);

export default router;
