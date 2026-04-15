import { Router, type IRouter } from "express";
import healthRouter from "./health";
import schoolMapDataRouter from "./schoolMapData";

const router: IRouter = Router();

router.use(healthRouter);
router.use(schoolMapDataRouter);

export default router;
