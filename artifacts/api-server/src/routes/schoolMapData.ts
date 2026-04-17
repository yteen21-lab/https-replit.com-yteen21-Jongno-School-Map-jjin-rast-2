import { Router, type IRouter } from "express";
import { Storage } from "@google-cloud/storage";

const router: IRouter = Router();

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ?? "";
const GCS_FILE   = "school-map-data.json";
const CACHE_TTL  = 60_000; // 1분 (ms)

function makeStorage(): Storage {
  return new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
      type: "external_account",
      credential_source: {
        url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
        format: {
          type: "json",
          subject_token_field_name: "access_token",
        },
      },
      universe_domain: "googleapis.com",
    } as Parameters<typeof Storage>[0]["credentials"],
    projectId: "",
  });
}

interface SchoolRecord { name: string; type: string; lat?: number; lng?: number; [k: string]: unknown; }
interface TobaccoRecord { name: string; lat?: number; lng?: number; address?: string; [k: string]: unknown; }

interface SharedData {
  schools: unknown[];
  tobacco: unknown[];
  savedAt: string;
}

/* ── 중복 제거 ── */
function deduplicateSchools(schools: unknown[]): unknown[] {
  const seen = new Set<string>();
  return schools.filter((s) => {
    const sc = s as SchoolRecord;
    /* 이름 + 학교 유형으로 중복 판별 */
    const key = `${(sc.name ?? "").trim()}|${(sc.type ?? "").trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateTobacco(tobacco: unknown[]): unknown[] {
  const seen = new Set<string>();
  return tobacco.filter((t) => {
    const sh = t as TobaccoRecord;
    /* 이름 + 주소(있으면), 없으면 이름 + 위치(소수점 4자리) */
    const lat4 = Math.round((sh.lat ?? 0) * 10000);
    const lng4 = Math.round((sh.lng ?? 0) * 10000);
    const key = sh.address
      ? `${(sh.name ?? "").trim()}|${sh.address.trim()}`
      : `${(sh.name ?? "").trim()}|${lat4}|${lng4}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ── 메모리 캐시 ── */
let cache: { data: SharedData; fetchedAt: number } | null = null;

function getCached(): SharedData | null {
  if (!cache) return null;
  if (Date.now() - cache.fetchedAt > CACHE_TTL) return null; // 만료
  return cache.data;
}

function setCache(data: SharedData): void {
  cache = { data, fetchedAt: Date.now() };
}

function clearCache(): void {
  cache = null;
}

/* ── GCS I/O ── */
async function loadFromGCS(): Promise<SharedData | null> {
  if (!BUCKET_ID) return null;
  try {
    const file = makeStorage().bucket(BUCKET_ID).file(GCS_FILE);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buf] = await file.download();
    return JSON.parse(buf.toString("utf-8")) as SharedData;
  } catch {
    return null;
  }
}

async function saveToGCS(data: SharedData): Promise<void> {
  if (!BUCKET_ID) throw new Error("Object storage not configured");
  const file = makeStorage().bucket(BUCKET_ID).file(GCS_FILE);
  await file.save(JSON.stringify(data, null, 2), {
    contentType: "application/json",
    resumable: false,
  });
}

/* ── 라우트 ── */
router.get("/school-map-data", async (_req, res) => {
  // 1. 캐시 우선
  const cached = getCached();
  if (cached) {
    res.json(cached);
    return;
  }

  // 2. 캐시 미스 → GCS 조회
  const data = await loadFromGCS();
  if (!data || (data.schools.length === 0 && data.tobacco.length === 0)) {
    res.status(404).json({ error: "No shared data yet" });
    return;
  }

  setCache(data);
  res.json(data);
});

router.post("/school-map-data", async (req, res) => {
  const body = req.body as Partial<SharedData>;
  if (!Array.isArray(body.schools) || !Array.isArray(body.tobacco)) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  /* 저장 전 중복 제거 */
  const cleanSchools = deduplicateSchools(body.schools);
  const cleanTobacco = deduplicateTobacco(body.tobacco);
  const data: SharedData = {
    schools: cleanSchools,
    tobacco: cleanTobacco,
    savedAt: new Date().toISOString(),
  };
  try {
    await saveToGCS(data);
    setCache(data);
    res.json({
      ok: true,
      savedAt: data.savedAt,
      schools: cleanSchools.length,
      tobacco: cleanTobacco.length,
      removedSchools: body.schools.length - cleanSchools.length,
      removedTobacco: body.tobacco.length - cleanTobacco.length,
    });
  } catch (err) {
    console.error("GCS save error:", err);
    clearCache();
    res.status(500).json({ error: "Failed to save data" });
  }
});

/* ── 기존 데이터 즉시 중복 제거 (일회성 정리용) ── */
router.post("/school-map-data/dedup", async (_req, res) => {
  try {
    const existing = await loadFromGCS();
    if (!existing) { res.status(404).json({ error: "No data" }); return; }

    const cleanSchools = deduplicateSchools(existing.schools);
    const cleanTobacco = deduplicateTobacco(existing.tobacco);
    const data: SharedData = { schools: cleanSchools, tobacco: cleanTobacco, savedAt: new Date().toISOString() };

    await saveToGCS(data);
    setCache(data);
    res.json({
      ok: true,
      removedSchools: existing.schools.length - cleanSchools.length,
      removedTobacco: existing.tobacco.length - cleanTobacco.length,
      schools: cleanSchools.length,
      tobacco: cleanTobacco.length,
    });
  } catch (err) {
    console.error("Dedup error:", err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
