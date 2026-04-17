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

interface SharedData {
  schools: unknown[];
  tobacco: unknown[];
  savedAt: string;
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
  const data: SharedData = {
    schools: body.schools,
    tobacco: body.tobacco,
    savedAt: new Date().toISOString(),
  };
  try {
    await saveToGCS(data);
    setCache(data); // 저장 즉시 캐시 갱신 → 다음 GET은 GCS 호출 없이 최신 데이터 반환
    res.json({ ok: true, savedAt: data.savedAt });
  } catch (err) {
    console.error("GCS save error:", err);
    clearCache(); // 저장 실패 시 캐시 무효화
    res.status(500).json({ error: "Failed to save data" });
  }
});

export default router;
