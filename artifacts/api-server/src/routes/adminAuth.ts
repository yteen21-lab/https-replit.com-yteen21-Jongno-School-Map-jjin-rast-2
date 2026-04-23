import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import { Storage } from "@google-cloud/storage";

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

/* ── 변경 이력 (GCS) ── */
const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ?? "";
const CHANGELOG_FILE = "school-map-changelog.json";
const MAX_ENTRIES = 300;

interface ChangelogEntry {
  at: string;
  adminName: string;
  schoolsAdded: string[];
  schoolsRemoved: string[];
  tobaccoAdded: string[];
  tobaccoRemoved: string[];
}

function makeStorage() {
  return new Storage({ projectId: "" });
}

export async function appendChangelog(entry: ChangelogEntry): Promise<void> {
  if (!BUCKET_ID) return;
  const file = makeStorage().bucket(BUCKET_ID).file(CHANGELOG_FILE);
  let existing: ChangelogEntry[] = [];
  try {
    const [buf] = await file.download();
    existing = JSON.parse(buf.toString("utf-8")) as ChangelogEntry[];
    if (!Array.isArray(existing)) existing = [];
  } catch { /* 파일 없으면 새로 생성 */ }

  existing.push(entry);
  /* 최대 300개 유지 */
  if (existing.length > MAX_ENTRIES) existing = existing.slice(-MAX_ENTRIES);

  await file.save(JSON.stringify(existing), { contentType: "application/json", resumable: false });
}

async function loadChangelog(): Promise<ChangelogEntry[]> {
  if (!BUCKET_ID) return [];
  const file = makeStorage().bucket(BUCKET_ID).file(CHANGELOG_FILE);
  try {
    const [buf] = await file.download();
    const arr = JSON.parse(buf.toString("utf-8")) as ChangelogEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
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
    const entries = await loadChangelog();
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
