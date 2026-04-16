import { Router } from "express";

const router = Router();

router.get("/kakao-sdk", async (req, res) => {
  const appKey = process.env.VITE_KAKAO_MAP_API_KEY;
  if (!appKey) {
    res.status(500).send("VITE_KAKAO_MAP_API_KEY not configured");
    return;
  }

  try {
    const kakaoUrl = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
    const response = await fetch(kakaoUrl);

    if (!response.ok) {
      res.status(response.status).send(`Kakao API error: ${response.status}`);
      return;
    }

    const js = await response.text();
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(js);
  } catch (err) {
    res.status(500).send("Failed to fetch Kakao SDK");
  }
});

export default router;
