import { Router } from "express";

const router = Router();

/* 허용 도메인: Kakao Developers 콘솔에 등록된 사이트 도메인 */
const ALLOWED_ORIGINS = [
  process.env.REPLIT_DEV_DOMAIN ?? "",
  "jongno-school-map--yteen21.replit.app",
].filter(Boolean);

router.get("/kakao-school-search", async (req, res) => {
  const appKey = process.env.VITE_KAKAO_MAP_API_KEY;
  if (!appKey) {
    res.status(500).json({ error: "VITE_KAKAO_MAP_API_KEY not configured" });
    return;
  }

  const { lat, lng, radius = "150" } = req.query as Record<string, string>;
  if (!lat || !lng) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }

  const origin = ALLOWED_ORIGINS[0] || "localhost";

  try {
    const url = new URL("https://dapi.kakao.com/v2/local/search/category.json");
    url.searchParams.set("category_group_code", "SC4");
    url.searchParams.set("y", lat);
    url.searchParams.set("x", lng);
    url.searchParams.set("radius", radius);
    url.searchParams.set("sort", "distance");
    url.searchParams.set("size", "8");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `KakaoAK ${appKey}`,
        KA: `sdk/1.0 os/javascript origin/${origin}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({ error: `Kakao API error: ${response.status}`, detail: text });
      return;
    }

    const data = await response.json() as {
      documents: Array<{
        id: string;
        place_name: string;
        category_name: string;
        category_group_code: string;
        address_name: string;
        road_address_name: string;
        x: string;
        y: string;
        distance: string;
      }>;
      meta: { total_count: number; pageable_count: number; is_end: boolean };
    };

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to search schools", detail: String(err) });
  }
});

export default router;
