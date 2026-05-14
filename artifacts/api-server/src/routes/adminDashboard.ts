import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, adminSnapshots, adminAccounts, schoolMapData } from "@workspace/db";
import { requireAdmin, extractBearerToken, getAdminName } from "./adminAuth";

const router = Router();

/* ─── Snapshots ─────────────────────────────────────────────────── */

/* GET /api/admin/snapshots */
router.get("/admin/snapshots", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id:           adminSnapshots.id,
        label:        adminSnapshots.label,
        createdAt:    adminSnapshots.createdAt,
        adminName:    adminSnapshots.adminName,
        schoolCount:  adminSnapshots.schoolCount,
        tobaccoCount: adminSnapshots.tobaccoCount,
      })
      .from(adminSnapshots)
      .orderBy(adminSnapshots.createdAt);
    res.json({ ok: true, snapshots: rows.reverse() });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/* POST /api/admin/snapshots */
router.post("/admin/snapshots", requireAdmin, async (req: Request, res: Response) => {
  const { label, data } = req.body as { label?: string; data?: { schools: unknown[]; tobacco: unknown[] } };
  if (!label || !data) { res.status(400).json({ ok: false, error: "label과 data가 필요합니다." }); return; }

  const adminName = getAdminName(extractBearerToken(req)) ?? "관리자";
  try {
    const [row] = await db.insert(adminSnapshots).values({
      label,
      adminName,
      schoolCount:  Array.isArray(data.schools) ? data.schools.length : 0,
      tobaccoCount: Array.isArray(data.tobacco) ? data.tobacco.length : 0,
      data,
    }).returning({ id: adminSnapshots.id });
    res.json({ ok: true, id: row.id });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/* DELETE /api/admin/snapshots/:id */
router.delete("/admin/snapshots/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? ""), 10);
  if (isNaN(id)) { res.status(400).json({ ok: false, error: "유효하지 않은 id" }); return; }
  try {
    await db.delete(adminSnapshots).where(eq(adminSnapshots.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/* POST /api/admin/snapshots/:id/restore — 스냅샷 데이터 반환 */
router.post("/admin/snapshots/:id/restore", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? ""), 10);
  if (isNaN(id)) { res.status(400).json({ ok: false, error: "유효하지 않은 id" }); return; }
  try {
    const [row] = await db.select().from(adminSnapshots).where(eq(adminSnapshots.id, id)).limit(1);
    if (!row) { res.status(404).json({ ok: false, error: "스냅샷을 찾을 수 없습니다." }); return; }
    res.json({ ok: true, data: row.data });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/* ─── Admin Accounts ─────────────────────────────────────────────── */

/* GET /api/admin/accounts */
router.get("/admin/accounts", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({ id: adminAccounts.id, name: adminAccounts.name, createdAt: adminAccounts.createdAt })
      .from(adminAccounts)
      .orderBy(adminAccounts.createdAt);

    /* 환경변수 계정도 포함 (표시만, 삭제 불가) */
    const envAccounts = getEnvAccounts().map(a => ({
      id: null as number | null,
      name: a.name,
      createdAt: null as Date | null,
      fromEnv: true,
    }));

    const dbAccounts = rows.map(r => ({ id: r.id, name: r.name, createdAt: r.createdAt, fromEnv: false }));
    res.json({ ok: true, accounts: [...envAccounts, ...dbAccounts] });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/* POST /api/admin/accounts */
router.post("/admin/accounts", requireAdmin, async (req: Request, res: Response) => {
  const { code, name } = req.body as { code?: string; name?: string };
  if (!code || !name) { res.status(400).json({ ok: false, error: "code와 name이 필요합니다." }); return; }
  if (code.length < 4) { res.status(400).json({ ok: false, error: "코드는 4자 이상이어야 합니다." }); return; }
  try {
    const [row] = await db.insert(adminAccounts).values({ code, name }).returning({ id: adminAccounts.id });
    res.json({ ok: true, id: row.id });
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ ok: false, error: "이미 존재하는 코드입니다." });
    } else {
      res.status(500).json({ ok: false, error: msg });
    }
  }
});

/* DELETE /api/admin/accounts/:id */
router.delete("/admin/accounts/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params["id"] ?? ""), 10);
  if (isNaN(id)) { res.status(400).json({ ok: false, error: "유효하지 않은 id" }); return; }
  try {
    await db.delete(adminAccounts).where(eq(adminAccounts.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/* ─── Stats ──────────────────────────────────────────────────────── */

/* GET /api/admin/stats — 현재 저장된 데이터 카운트 */
router.get("/admin/stats", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [row] = await db.select().from(schoolMapData).where(eq(schoolMapData.key, "main")).limit(1);
    if (!row) { res.json({ ok: true, schoolCount: 0, tobaccoCount: 0 }); return; }
    const schools = (row.schools as unknown[]) ?? [];
    const tobacco = (row.tobacco as unknown[]) ?? [];
    res.json({ ok: true, schoolCount: schools.length, tobaccoCount: tobacco.length, savedAt: row.savedAt });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/* ─── Helper ─────────────────────────────────────────────────────── */
function getEnvAccounts(): { code: string; name: string }[] {
  const raw = process.env.ADMIN_ACCOUNTS;
  if (raw) { try { return JSON.parse(raw) as { code: string; name: string }[]; } catch { /* ignore */ } }
  const pw = process.env.ADMIN_PASSWORD ?? "";
  return pw ? [{ code: pw, name: "관리자(env)" }] : [];
}

export default router;
