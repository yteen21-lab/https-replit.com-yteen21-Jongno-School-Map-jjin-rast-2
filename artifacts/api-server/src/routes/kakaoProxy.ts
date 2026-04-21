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

    let js = await response.text();

    /* Safari 호환 패치: document.write(<script src="...">) → 동적 삽입
     * 카카오 SDK 부트스트랩이 내부적으로 document.write()를 사용해 메인 스크립트를
     * 주입하는데, Safari는 이 방식으로 로드된 크로스 사이트 스크립트를 차단합니다.
     * 서버에서 미리 document.write 패턴을 createElement 방식으로 교체합니다. */
    js = js.replace(
      /document\.write\s*\(\s*(['"`])<script([^>]*?)src\s*=\s*(['"`])([^'"` >]+)\3([^>]*?)>\s*(?:<\\\/script>|<\/script>)?\s*\1\s*\)/gi,
      (_match, _q1, _before, _q2, src, _after) =>
        `(function(){var _s=document.createElement('script');_s.src=${JSON.stringify(src)};_s.async=false;document.head.appendChild(_s);})();`
    );

    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(js);
  } catch (err) {
    res.status(500).send("Failed to fetch Kakao SDK");
  }
});

export default router;
