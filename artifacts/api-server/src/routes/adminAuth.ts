import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/admin-verify", (req, res) => {
  const { password } = req.body as { password?: string };
  const correct = process.env.ADMIN_PASSWORD ?? "";

  if (!password || password !== correct) {
    res.status(401).json({ ok: false, error: "비밀번호가 올바르지 않습니다." });
    return;
  }

  res.json({ ok: true });
});

export default router;
