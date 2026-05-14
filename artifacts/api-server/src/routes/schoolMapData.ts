import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { Storage } from "@google-cloud/storage";
import { db, schoolMapData, schoolMapChangelog } from "@workspace/db";
import { getAdminName, extractBearerToken } from "./adminAuth";

/* ── GCS 마이그레이션용 (기존 데이터 이전 후 제거 가능) ── */
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ?? "";
const GCS_FILE  = "school-map-data.json";
let gcsMigrated = false;

async function loadFromGCSOnce(): Promise<SharedData | null> {
  if (gcsMigrated || !BUCKET_ID) return null;
  try {
    const storage = new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: { type: "json", subject_token_field_name: "access_token" },
        },
        universe_domain: "googleapis.com",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      projectId: "",
    });
    const file = storage.bucket(BUCKET_ID).file(GCS_FILE);
    const [exists] = await file.exists();
    if (!exists) { gcsMigrated = true; return null; }
    const [buf] = await file.download();
    const data = JSON.parse(buf.toString("utf-8")) as SharedData;
    gcsMigrated = true;
    return data;
  } catch {
    return null;
  }
}

const router: IRouter = Router();

interface SchoolRecord { id?: string; name: string; type: string; lat?: number; lng?: number; district?: string; propertyRadius?: number; [k: string]: unknown; }
interface TobaccoRecord { id?: string; name: string; lat?: number; lng?: number; address?: string; shopType?: string; [k: string]: unknown; }

/* 좌표 소수점 5자리 제한 (약 1m 정밀도) */
function r5(v: number): number { return Math.round(v * 1e5) / 1e5; }

function cleanSchool(s: unknown): unknown {
  const sc = s as SchoolRecord;
  const o: Record<string, unknown> = {
    id: sc.id, name: sc.name, type: sc.type,
    lat: r5(sc.lat ?? 0), lng: r5(sc.lng ?? 0),
  };
  if (sc.district)        o.district        = sc.district;
  if (sc.propertyRadius)  o.propertyRadius  = sc.propertyRadius;
  return o;
}

function cleanTobacco(t: unknown): unknown {
  const sh = t as TobaccoRecord;
  const o: Record<string, unknown> = {
    id: sh.id, name: sh.name,
    lat: r5(sh.lat ?? 0), lng: r5(sh.lng ?? 0),
    shopType: sh.shopType ?? "무인",
  };
  if (sh.address) o.address = sh.address;
  return o;
}

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

/* ── 메모리 캐시 (10분 TTL) ── */
const CACHE_TTL = 10 * 60_000;
let cache: { data: SharedData; fetchedAt: number } | null = null;

function getCached(): SharedData | null {
  if (!cache) return null;
  if (Date.now() - cache.fetchedAt > CACHE_TTL) return null;
  return cache.data;
}

function setCache(data: SharedData): void {
  cache = { data, fetchedAt: Date.now() };
}

/* ── PostgreSQL I/O ── */
async function loadFromDB(): Promise<SharedData | null> {
  const rows = await db.select().from(schoolMapData).where(eq(schoolMapData.key, "main")).limit(1);
  if (rows.length) {
    const row = rows[0];
    const dbData = {
      schools: (row.schools as unknown[]) ?? [],
      tobacco: (row.tobacco as unknown[]) ?? [],
      savedAt: row.savedAt.toISOString(),
    };
    /* DB에 데이터가 있으면 그대로 사용 */
    if (dbData.schools.length > 0 || dbData.tobacco.length > 0) return dbData;
  }

  /* DB가 비어있으면 GCS에서 한 번만 마이그레이션 시도 */
  const gcsData = await loadFromGCSOnce();
  if (gcsData && (gcsData.schools.length > 0 || gcsData.tobacco.length > 0)) {
    /* GCS 데이터를 PostgreSQL로 자동 이전 */
    await saveToDB(gcsData);
    return gcsData;
  }
  return null;
}

async function saveToDB(data: SharedData): Promise<void> {
  await db
    .insert(schoolMapData)
    .values({
      key:     "main",
      schools: data.schools as never,
      tobacco: data.tobacco as never,
      savedAt: new Date(data.savedAt),
    })
    .onConflictDoUpdate({
      target: schoolMapData.key,
      set: {
        schools: data.schools as never,
        tobacco: data.tobacco as never,
        savedAt: new Date(data.savedAt),
      },
    });
}

/* ── 변경 이력 ── */
function diffItems(prev: unknown[], next: unknown[]): { added: string[]; removed: string[] } {
  type Item = { id?: string; name?: string };
  const prevMap = new Map((prev as Item[]).map(x => [x.id ?? "", x.name ?? ""]));
  const nextMap = new Map((next as Item[]).map(x => [x.id ?? "", x.name ?? ""]));
  const added   = (next as Item[]).filter(x => x.id && !prevMap.has(x.id)).map(x => x.name ?? x.id ?? "");
  const removed = (prev as Item[]).filter(x => x.id && !nextMap.has(x.id)).map(x => x.name ?? x.id ?? "");
  return { added, removed };
}

async function appendChangelogDB(entry: {
  at: string; adminName: string;
  schoolsAdded: string[]; schoolsRemoved: string[];
  tobaccoAdded: string[]; tobaccoRemoved: string[];
}): Promise<void> {
  await db.insert(schoolMapChangelog).values({
    savedAt:         new Date(entry.at),
    adminName:       entry.adminName,
    schoolsAdded:    entry.schoolsAdded,
    schoolsRemoved:  entry.schoolsRemoved,
    tobaccoAdded:    entry.tobaccoAdded,
    tobaccoRemoved:  entry.tobaccoRemoved,
  });
}


/* ── 캐시 워밍업: 서버 시작 직후 DB 데이터를 미리 로드 ── */
loadFromDB()
  .then((data) => {
    if (data && (data.schools.length > 0 || data.tobacco.length > 0)) {
      setCache(data);
    }
  })
  .catch(() => { /* 워밍업 실패는 무시 */ });

/* ── 라우트 ── */
router.get("/school-map-data", async (_req, res) => {
  const cached = getCached();
  if (cached) {
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
    res.json(cached);
    return;
  }

  const data = await loadFromDB();
  if (!data || (data.schools.length === 0 && data.tobacco.length === 0)) {
    res.status(404).json({ error: "No shared data yet" });
    return;
  }

  setCache(data);
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
  res.json(data);
});

router.post("/school-map-data", async (req, res) => {
  const body = req.body as Partial<SharedData>;
  if (!Array.isArray(body.schools) || !Array.isArray(body.tobacco)) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const cleanSchools  = deduplicateSchools(body.schools).map(cleanSchool);
  const cleanTobaccos = deduplicateTobacco(body.tobacco).map(cleanTobacco);
  const data: SharedData = {
    schools:  cleanSchools,
    tobacco:  cleanTobaccos,
    savedAt:  new Date().toISOString(),
  };

  const prevData = getCached() ?? await loadFromDB();

  try {
    await saveToDB(data);
    setCache(data);
    res.json({
      ok: true,
      savedAt: data.savedAt,
      schools: cleanSchools.length,
      tobacco: cleanTobaccos.length,
      removedSchools: body.schools.length - cleanSchools.length,
      removedTobacco: body.tobacco.length - cleanTobaccos.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to save data" });
    return;
  }

  /* 비동기 changelog 기록 */
  const adminName = getAdminName(extractBearerToken(req)) ?? "자동 동기화";
  const { added: schoolsAdded, removed: schoolsRemoved } = diffItems(prevData?.schools ?? [], cleanSchools);
  const { added: tobaccoAdded, removed: tobaccoRemoved } = diffItems(prevData?.tobacco ?? [], cleanTobaccos);
  appendChangelogDB({ at: data.savedAt, adminName, schoolsAdded, schoolsRemoved, tobaccoAdded, tobaccoRemoved })
    .catch(e => console.warn("changelog append failed:", e));
});

/* ── 기존 데이터 중복 제거 (일회성 정리용) ── */
router.post("/school-map-data/dedup", async (_req, res) => {
  try {
    const existing = await loadFromDB();
    if (!existing) { res.status(404).json({ error: "No data" }); return; }

    const dedupedSchools = deduplicateSchools(existing.schools).map(cleanSchool);
    const dedupedTobacco = deduplicateTobacco(existing.tobacco).map(cleanTobacco);
    const data: SharedData = { schools: dedupedSchools, tobacco: dedupedTobacco, savedAt: new Date().toISOString() };

    await saveToDB(data);
    setCache(data);
    res.json({
      ok: true,
      removedSchools: existing.schools.length - dedupedSchools.length,
      removedTobacco: existing.tobacco.length - dedupedTobacco.length,
      schools: dedupedSchools.length,
      tobacco: dedupedTobacco.length,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
