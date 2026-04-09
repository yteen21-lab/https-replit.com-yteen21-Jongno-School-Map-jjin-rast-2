import { useEffect, useState } from "react";

declare global {
  interface Window {
    kakao: any;
  }
}

export function useKakaoMap() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("초기화 중...");

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 60; // 12초 대기

    const tryInit = () => {
      attempts++;
      const kakaoExists = typeof window.kakao !== "undefined";
      const mapsExists = kakaoExists && typeof window.kakao.maps !== "undefined";

      setDebugInfo(`시도 ${attempts}/${maxAttempts} | kakao: ${kakaoExists} | maps: ${mapsExists}`);

      if (mapsExists) {
        try {
          window.kakao.maps.load(() => {
            setIsLoaded(true);
            setDebugInfo("로드 완료");
          });
        } catch (e: any) {
          // maps.load가 없으면 이미 로드된 것
          setIsLoaded(true);
          setDebugInfo("로드 완료 (즉시)");
        }
        return true;
      }

      if (attempts >= maxAttempts) {
        const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;
        setError("카카오맵 SDK 로드 시간 초과");
        setDebugInfo(`키 앞 6자리: ${apiKey?.substring(0, 6) ?? "없음"} | kakao 객체: ${kakaoExists}`);
        return true; // stop polling
      }

      return false;
    };

    if (tryInit()) return;

    const timer = setInterval(() => {
      if (tryInit()) {
        clearInterval(timer);
      }
    }, 200);

    return () => clearInterval(timer);
  }, []);

  return { isLoaded, error, debugInfo };
}
