import { Router, type IRouter } from "express";
import healthRouter from "./health";
import schoolMapDataRouter from "./schoolMapData";
import kakaoProxyRouter from "./kakaoProxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(schoolMapDataRouter);
router.use(kakaoProxyRouter);

export default router;
