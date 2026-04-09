import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;

console.log("[School Map] Naver Client ID present:", !!NAVER_CLIENT_ID, "| Length:", NAVER_CLIENT_ID?.length ?? 0);

if (NAVER_CLIENT_ID) {
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_CLIENT_ID}&submodules=drawing`;
  script.onerror = (e) => {
    console.error("[School Map] Naver Maps script failed to load:", e);
  };
  script.onload = () => {
    console.log("[School Map] Naver Maps script loaded, naver:", typeof (window as any).naver);
  };
  document.head.appendChild(script);
} else {
  console.error("[School Map] VITE_NAVER_MAP_CLIENT_ID is not set!");
}

createRoot(document.getElementById("root")!).render(<App />);
