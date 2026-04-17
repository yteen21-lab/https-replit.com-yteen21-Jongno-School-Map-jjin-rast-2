import { Router } from "express";

const router = Router();

interface GeocodeResult {
  address: string;
  lat: number | null;
  lng: number | null;
}

function kakaoHeaders(appKey: string): Record<string, string> {
  return {
    Authorization: `KakaoAK ${appKey}`,
    KA: "sdk/2.0 os/nodejs origin/https://jongno-school-map--yteen21.replit.app",
  };
}

async function geocodeSingle(address: string, appKey: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", address);
  url.searchParams.set("size", "1");

  try {
    const res = await fetch(url.toString(), { headers: kakaoHeaders(appKey) });
    if (res.ok) {
      const data = await res.json() as { documents: Array<{ x: string; y: string }> };
      if (data.documents?.length) {
        return { lat: parseFloat(data.documents[0].y), lng: parseFloat(data.documents[0].x) };
      }
    }

    /* 주소 검색 실패 → 키워드 검색으로 폴백 */
    const kUrl = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    kUrl.searchParams.set("query", address);
    kUrl.searchParams.set("size", "1");
    const kRes = await fetch(kUrl.toString(), { headers: kakaoHeaders(appKey) });
    if (!kRes.ok) return null;
    const kData = await kRes.json() as { documents: Array<{ x: string; y: string }> };
    if (!kData.documents?.length) return null;
    return { lat: parseFloat(kData.documents[0].y), lng: parseFloat(kData.documents[0].x) };
  } catch {
    return null;
  }
}

/** 동시 실행 수를 제한하는 병렬 처리 헬퍼 */
async function pooled<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

/* POST /api/kakao-geocode
 * body: { addresses: string[] }
 * returns: { results: GeocodeResult[], total, success }
 * 5개씩 병렬 처리 — Kakao 10 QPS 초과 방지 */
router.post("/kakao-geocode", async (req, res) => {
  const appKey = process.env.VITE_KAKAO_MAP_API_KEY;
  if (!appKey) {
    res.status(500).json({ error: "VITE_KAKAO_MAP_API_KEY not configured" });
    return;
  }

  const { addresses } = req.body as { addresses?: unknown };
  if (!Array.isArray(addresses) || addresses.length === 0) {
    res.status(400).json({ error: "addresses array required" });
    return;
  }

  const MAX = 300;
  const list = (addresses as string[]).slice(0, MAX);

  const tasks = list.map((addr) => async (): Promise<GeocodeResult> => {
    const trimmed = String(addr ?? "").trim();
    if (!trimmed) return { address: trimmed, lat: null, lng: null };
    const coords = await geocodeSingle(trimmed, appKey);
    return { address: trimmed, lat: coords?.lat ?? null, lng: coords?.lng ?? null };
  });

  const results = await pooled(tasks, 5);

  res.json({
    results,
    total: list.length,
    success: results.filter((r) => r.lat !== null).length,
  });
});

export default router;
