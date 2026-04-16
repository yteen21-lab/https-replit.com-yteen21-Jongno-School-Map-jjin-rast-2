import { useEffect, useRef, useCallback } from "react";
import {
  School, TobaccoShop,
  SCHOOL_TYPE_COLORS, CIRCLE_CONFIGS,
  TOBACCO_ZONE_COLORS, getTobaccoZone,
} from "@/types/school";

interface LeafletMapProps {
  schools: School[];
  tobaccoShops: TobaccoShop[];
  selectedSchool: School | null;
  selectedTobaccoShop: TobaccoShop | null;
  onSelectSchool: (school: School | null) => void;
  showRadius50: boolean;
  showRadius200: boolean;
  showTobacco: boolean;
  districtPolygon?: [number, number][];
}

const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 };
const SEOUL_LEVEL = 8;
const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY as string;

type KakaoLayer = kakao.maps.CustomOverlay | kakao.maps.Circle | kakao.maps.Polygon | kakao.maps.Marker;

let kakaoLoaded = false;
let kakaoLoadCallbacks: (() => void)[] = [];

function loadKakao(callback: () => void) {
  if (kakaoLoaded) { callback(); return; }
  kakaoLoadCallbacks.push(callback);
  if (kakaoLoadCallbacks.length > 1) return;

  const w = window as any;

  const runLoad = () => {
    w.kakao.maps.load(() => {
      kakaoLoaded = true;
      kakaoLoadCallbacks.forEach((cb) => cb());
      kakaoLoadCallbacks = [];
    });
  };

  if (w.kakao) {
    runLoad();
  } else {
    // 스크립트가 아직 파싱 중이면 잠시 대기
    const timer = setInterval(() => {
      if (w.kakao) {
        clearInterval(timer);
        runLoad();
      }
    }, 50);
  }
}

export default function LeafletMap({
  schools,
  tobaccoShops,
  selectedSchool,
  selectedTobaccoShop,
  onSelectSchool,
  showRadius50,
  showRadius200,
  showTobacco,
  districtPolygon,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const schoolLayersRef = useRef<KakaoLayer[]>([]);
  const tobaccoLayersRef = useRef<KakaoLayer[]>([]);
  const districtLayerRef = useRef<kakao.maps.Polygon | null>(null);
  const openPopupRef = useRef<HTMLElement | null>(null);

  const clearSchoolLayers = useCallback(() => {
    schoolLayersRef.current.forEach((l) => l.setMap(null));
    schoolLayersRef.current = [];
  }, []);

  const clearTobaccoLayers = useCallback(() => {
    tobaccoLayersRef.current.forEach((l) => l.setMap(null));
    tobaccoLayersRef.current = [];
    if (openPopupRef.current) {
      openPopupRef.current.remove();
      openPopupRef.current = null;
    }
  }, []);

  /* ── 지도 초기화 ── */
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    loadKakao(() => {
      if (destroyed || !containerRef.current) return;

      const map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng),
        level: SEOUL_LEVEL,
      });

      kakao.maps.event.addListener(map, "click", () => {
        onSelectSchool(null);
        if (openPopupRef.current) {
          openPopupRef.current.remove();
          openPopupRef.current = null;
        }
      });

      mapRef.current = map;
    });

    return () => {
      destroyed = true;
      clearSchoolLayers();
      clearTobaccoLayers();
      if (districtLayerRef.current) districtLayerRef.current.setMap(null);
      mapRef.current = null;
    };
  }, []);

  /* ── 학교 마커 & 반경 원 ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !kakaoLoaded) return;
    clearSchoolLayers();

    schools.forEach((school) => {
      const color = SCHOOL_TYPE_COLORS[school.type];
      const isSelected = selectedSchool?.id === school.id;
      const size = isSelected ? 20 : 14;
      const pos = new kakao.maps.LatLng(school.lat, school.lng);

      const el = document.createElement("div");
      el.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;";
      el.innerHTML = `
        <div style="
          width:${size}px;height:${size}px;
          background:${color};border:2px solid white;border-radius:50%;
          box-shadow:0 2px 6px rgba(0,0,0,0.4);
        "></div>
        <div style="
          background:white;border:1px solid ${color};border-radius:4px;
          padding:2px 6px;font-size:11px;font-family:'Noto Sans KR',sans-serif;
          font-weight:500;color:#1e293b;white-space:nowrap;
          box-shadow:0 1px 4px rgba(0,0,0,0.15);
        ">${school.name}</div>`;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectSchool(school);
      });

      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: el,
        map,
        zIndex: isSelected ? 10 : 1,
        xAnchor: 0.5,
        yAnchor: 0.5,
      });

      schoolLayersRef.current.push(overlay);

      CIRCLE_CONFIGS.forEach((cfg) => {
        const shouldShow =
          (cfg.radius === 50 && showRadius50) ||
          (cfg.radius === 200 && showRadius200);
        if (!shouldShow) return;

        const circle = new kakao.maps.Circle({
          center: pos,
          radius: cfg.radius,
          map,
          strokeWeight: cfg.radius === 50 ? 3 : 2,
          strokeColor: cfg.color,
          strokeOpacity: 1,
          fillColor: cfg.fillColor,
          fillOpacity: cfg.radius === 50 ? 0.55 : 0.45,
        });

        schoolLayersRef.current.push(circle);
      });
    });
  }, [schools, selectedSchool, showRadius50, showRadius200]);

  /* ── 담배 업소 마커 ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !kakaoLoaded) return;
    clearTobaccoLayers();
    if (!showTobacco) return;

    tobaccoShops.forEach((shop) => {
      const zone = getTobaccoZone(shop, schools);
      const color = TOBACCO_ZONE_COLORS[zone];
      const isUnmanned = shop.shopType !== "유인";
      const shopTypeLabel = isUnmanned ? "무인" : "유인";
      const shopTypeColor = isUnmanned ? "#475569" : "#7C3AED";
      const shopEmoji = isUnmanned ? "🚬" : "🏪";
      const shortName = shop.name
        .replace("무인전자담배 ", "")
        .replace("무인담배 ", "")
        .replace("담배샵 ", "");
      const zoneLabel =
        zone === "50m이내"  ? "🔴 학교 50m 이내 (위반)" :
        zone === "200m이내" ? "🟠 학교 200m 이내 (경고)" :
                              "⚫ 학교 200m 외부 (정상)";

      const el = document.createElement("div");
      el.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;";
      el.innerHTML = `
        <div style="position:relative;width:28px;height:28px;">
          <div style="
            width:28px;height:28px;background:${color};border:3px solid white;
            border-radius:6px;box-shadow:0 3px 8px rgba(0,0,0,0.5);
            display:flex;align-items:center;justify-content:center;
            font-size:14px;line-height:1;
          ">${shopEmoji}</div>
          <div style="
            position:absolute;top:-6px;right:-8px;
            background:${shopTypeColor};color:white;
            font-size:8px;font-weight:700;border-radius:3px;padding:1px 3px;
            font-family:'Noto Sans KR',sans-serif;border:1px solid white;line-height:1.2;
          ">${shopTypeLabel}</div>
        </div>
        <div style="
          background:${color};color:white;border-radius:4px;
          padding:2px 6px;font-size:10px;font-family:'Noto Sans KR',sans-serif;
          font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);
          max-width:110px;overflow:hidden;text-overflow:ellipsis;
        ">${shortName}</div>`;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (openPopupRef.current) {
          openPopupRef.current.remove();
          openPopupRef.current = null;
        }

        const popup = document.createElement("div");
        popup.style.cssText = `
          position:absolute;transform:translate(-50%,-110%);
          background:white;border-radius:10px;padding:12px 14px;min-width:180px;
          box-shadow:0 4px 16px rgba(0,0,0,0.18);
          font-family:'Noto Sans KR',sans-serif;
          border-top:4px solid ${color};z-index:100;
        `;
        popup.innerHTML = `
          <button style="position:absolute;top:6px;right:8px;background:none;border:none;cursor:pointer;font-size:14px;color:#94a3b8;">✕</button>
          <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#1e293b;padding-right:20px;">${shop.name}</div>
          <div style="margin-bottom:6px;">
            <span style="display:inline-block;background:${shopTypeColor};color:white;font-size:10px;font-weight:700;border-radius:4px;padding:2px 6px;">
              ${isUnmanned ? "🚬 무인전자담배자판기" : "🏪 오프라인전자담배"}
            </span>
          </div>
          ${shop.address ? `<p style="font-size:11px;color:#64748b;margin:0 0 6px;">${shop.address}</p>` : ""}
          <p style="font-size:12px;font-weight:600;color:${color};margin:0;">${zoneLabel}</p>`;

        popup.querySelector("button")?.addEventListener("click", (ev) => {
          ev.stopPropagation();
          popup.remove();
          openPopupRef.current = null;
        });

        el.style.position = "relative";
        el.appendChild(popup);
        openPopupRef.current = popup;
      });

      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(shop.lat, shop.lng),
        content: el,
        map,
        zIndex: 5,
        xAnchor: 0.5,
        yAnchor: 0.5,
      });

      tobaccoLayersRef.current.push(overlay);
    });
  }, [tobaccoShops, schools, showTobacco]);

  /* ── 구 하이라이트 폴리곤 ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !kakaoLoaded) return;

    if (districtLayerRef.current) {
      districtLayerRef.current.setMap(null);
      districtLayerRef.current = null;
    }

    if (!districtPolygon || districtPolygon.length < 3) return;

    const path = districtPolygon.map(([lat, lng]) => new kakao.maps.LatLng(lat, lng));
    const poly = new kakao.maps.Polygon({
      path,
      map,
      strokeWeight: 2,
      strokeColor: "#2563EB",
      strokeOpacity: 0.7,
      fillColor: "#93C5FD",
      fillOpacity: 0.25,
    });
    districtLayerRef.current = poly;
  }, [districtPolygon]);

  /* ── 선택된 학교로 이동 ── */
  useEffect(() => {
    if (!mapRef.current || !selectedSchool || !kakaoLoaded) return;
    mapRef.current.panTo(new kakao.maps.LatLng(selectedSchool.lat, selectedSchool.lng));
  }, [selectedSchool]);

  /* ── 선택된 담배업소로 이동 ── */
  useEffect(() => {
    if (!mapRef.current || !selectedTobaccoShop || !kakaoLoaded) return;
    mapRef.current.setCenter(new kakao.maps.LatLng(selectedTobaccoShop.lat, selectedTobaccoShop.lng));
    mapRef.current.setLevel(4, { animate: { duration: 400 } });
  }, [selectedTobaccoShop]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
  );
}
