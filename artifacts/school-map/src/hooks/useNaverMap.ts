import { useEffect, useState } from "react";

declare global {
  interface Window {
    naver: any;
  }
}

export function useNaverMap() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 60;

    const tryInit = () => {
      attempts++;
      const naverExists = typeof window.naver !== "undefined";
      const mapsExists = naverExists && typeof window.naver.maps !== "undefined";

      if (mapsExists) {
        setIsLoaded(true);
        return true;
      }

      if (attempts >= maxAttempts) {
        setError("네이버 지도 SDK 로드 시간 초과. Client ID를 확인해주세요.");
        return true;
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

  return { isLoaded, error };
}
