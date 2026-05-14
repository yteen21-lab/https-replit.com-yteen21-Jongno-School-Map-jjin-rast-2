import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import { db, schoolMapChangelog } from "@workspace/db";

const router: Router = Router();

/* ── 계정 목록 ── */
interface AdminAccount { code: string; name: string; }
interface Session { adminName: string; createdAt: number; }

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24시간
const sessions = new Map<string, Session>();

/* 만료 세션 정리 (1시간마다) */
setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL;
  for (const [token, s] of sessions) {
    if (s.createdAt < cutoff) sessions.delete(token);
  }
}, 60 * 60 * 1000);

function getAccounts(): AdminAccount[] {
  const raw = process.env.ADMIN_ACCOUNTS;
  if (raw) {
    try { return JSON.parse(raw) as AdminAccount[]; } catch { /* fallthrough */ }
  }
  /* 하위 호환: 단일 ADMIN_PASSWORD */
  const pw = process.env.ADMIN_PASSWORD ?? "";
  return pw ? [{ code: pw, name: "관리자" }] : [];
}

/* 다른 라우트에서 사용하는 헬퍼 */
export function getAdminName(token: string | undefined): string | null {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() - s.createdAt > SESSION_TTL) { sessions.delete(token); return null; }
  return s.adminName;
}

export function extractBearerToken(req: Request): string | undefined {
  const h = req.headers.authorization ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : undefined;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!getAdminName(extractBearerToken(req))) {
    res.status(401).json({ ok: false, error: "관리자 인증이 필요합니다." });
    return;
  }
  next();
}


/* ── 라우트 ── */

/* POST /api/admin-login */
router.post("/admin-login", (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code) { res.status(400).json({ ok: false, error: "코드를 입력해 주세요." }); return; }

  const account = getAccounts().find(a => a.code === code);
  if (!account) { res.status(401).json({ ok: false, error: "코드가 올바르지 않습니다." }); return; }

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { adminName: account.name, createdAt: Date.now() });
  res.json({ ok: true, adminName: account.name, token });
});

/* POST /api/admin-logout */
router.post("/admin-logout", (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

/* GET /api/admin/changelog  — 관리자 인증 필요 */
router.get("/admin/changelog", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(schoolMapChangelog)
      .orderBy(schoolMapChangelog.savedAt)
      .limit(300);
    const entries = rows.map(r => ({
      at:             r.savedAt.toISOString(),
      adminName:      r.adminName ?? "관리자",
      schoolsAdded:   (r.schoolsAdded ?? []) as string[],
      schoolsRemoved: (r.schoolsRemoved ?? []) as string[],
      tobaccoAdded:   (r.tobaccoAdded ?? []) as string[],
      tobaccoRemoved: (r.tobaccoRemoved ?? []) as string[],
    }));
    res.json({ ok: true, entries: [...entries].reverse() }); // 최신순
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/* Legacy: POST /api/admin-verify */
router.post("/admin-verify", (req: Request, res: Response) => {
  const { password } = req.body as { password?: string };
  const account = getAccounts().find(a => a.code === (password ?? ""));
  if (!account) { res.status(401).json({ ok: false, error: "비밀번호가 올바르지 않습니다." }); return; }
  res.json({ ok: true });
});

export default router;
