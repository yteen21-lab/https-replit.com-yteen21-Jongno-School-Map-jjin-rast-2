import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY as string | undefined;

console.log("[School Map] API Key present:", !!KAKAO_KEY, "| Length:", KAKAO_KEY?.length ?? 0);

if (KAKAO_KEY) {
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;
  script.onerror = (e) => {
    console.error("[School Map] Kakao script failed to load:", e);
  };
  script.onload = () => {
    console.log("[School Map] Kakao script loaded, kakao:", typeof window.kakao);
  };
  document.head.appendChild(script);
} else {
  console.error("[School Map] VITE_KAKAO_MAP_API_KEY is not set!");
}

createRoot(document.getElementById("root")!).render(<App />);
