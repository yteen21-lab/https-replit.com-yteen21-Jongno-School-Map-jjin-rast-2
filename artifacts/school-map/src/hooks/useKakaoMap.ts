import { useEffect, useState } from "react";

declare global {
  interface Window {
    kakao: any;
  }
}

export function useKakaoMap() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    if (window.kakao && window.kakao.maps) {
      setIsLoaded(true);
      return;
    }

    const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;
    if (!apiKey) {
      setError("카카오맵 API 키(VITE_KAKAO_MAP_API_KEY)가 설정되지 않았습니다.");
      return;
    }

    const scriptSrc = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.type = "text/javascript";

    script.onload = () => {
      try {
        window.kakao.maps.load(() => {
          setIsLoaded(true);
        });
      } catch (e: any) {
        setError(`SDK 초기화 실패: ${e?.message || String(e)}`);
        setDebugInfo(`스크립트는 로드됐지만 초기화 실패. 키 타입 확인 필요 (JavaScript 키 사용 여부)`);
      }
    };

    script.onerror = (e) => {
      console.error("Kakao Maps script load error:", e);
      setError("카카오맵 스크립트를 불러오지 못했습니다.");
      setDebugInfo(`도메인: ${window.location.origin} | 키 앞 4자리: ${apiKey.substring(0, 4)}****`);
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return { isLoaded, error, debugInfo };
}
