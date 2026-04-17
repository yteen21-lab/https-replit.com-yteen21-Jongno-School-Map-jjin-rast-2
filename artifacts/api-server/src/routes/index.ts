import { Router, type IRouter } from "express";
import healthRouter from "./health";
import schoolMapDataRouter from "./schoolMapData";
import kakaoProxyRouter from "./kakaoProxy";
import kakaoSchoolSearchRouter from "./kakaoSchoolSearch";
import adminAuthRouter from "./adminAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(schoolMapDataRouter);
router.use(kakaoProxyRouter);
router.use(kakaoSchoolSearchRouter);
router.use(adminAuthRouter);

export default router;
