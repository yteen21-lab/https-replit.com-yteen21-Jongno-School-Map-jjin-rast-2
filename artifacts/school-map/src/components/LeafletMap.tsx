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

type NaverLayer = naver.maps.Marker | naver.maps.Circle | naver.maps.Polygon;

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
  const mapRef = useRef<naver.maps.Map | null>(null);
  const schoolLayersRef = useRef<NaverLayer[]>([]);
  const tobaccoLayersRef = useRef<NaverLayer[]>([]);
  const districtLayerRef = useRef<naver.maps.Polygon | null>(null);
  const infoWindowRef = useRef<naver.maps.InfoWindow | null>(null);
  const mapClickListenerRef = useRef<object | null>(null);

  const clearSchoolLayers = useCallback(() => {
    schoolLayersRef.current.forEach((l) => l.setMap(null));
    schoolLayersRef.current = [];
  }, []);

  const clearTobaccoLayers = useCallback(() => {
    tobaccoLayersRef.current.forEach((l) => l.setMap(null));
    tobaccoLayersRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, []);

  /* ── 지도 초기화 ── */
  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof naver === "undefined" || !naver.maps) return;

    const map = new naver.maps.Map(containerRef.current, {
      center: new naver.maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng),
      zoom: 12,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.TOP_LEFT },
    });

    mapClickListenerRef.current = naver.maps.Event.addListener(map, "click", () => {
      onSelectSchool(null);
      if (infoWindowRef.current) infoWindowRef.current.close();
    });

    mapRef.current = map;

    return () => {
      clearSchoolLayers();
      clearTobaccoLayers();
      if (districtLayerRef.current) districtLayerRef.current.setMap(null);
      if (mapClickListenerRef.current) {
        naver.maps.Event.removeListener(mapClickListenerRef.current);
      }
      map.destroy();
      mapRef.current = null;
    };
  }, []);

  /* ── 학교 마커 & 반경 원 ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof naver === "undefined") return;
    clearSchoolLayers();

    schools.forEach((school) => {
      const color = SCHOOL_TYPE_COLORS[school.type];
      const isSelected = selectedSchool?.id === school.id;
      const size = isSelected ? 20 : 14;

      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(school.lat, school.lng),
        map,
        icon: {
          content: `
            <div style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;">
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
              ">${school.name}</div>
            </div>`,
          anchor: new naver.maps.Point(size / 2, size / 2),
        },
        zIndex: isSelected ? 1000 : 0,
      });

      naver.maps.Event.addListener(marker, "click", (e) => {
        e.stopPropagation?.();
        onSelectSchool(school);
      });

      schoolLayersRef.current.push(marker);

      CIRCLE_CONFIGS.forEach((cfg) => {
        const shouldShow =
          (cfg.radius === 50 && showRadius50) ||
          (cfg.radius === 200 && showRadius200);
        if (!shouldShow) return;

        const circle = new naver.maps.Circle({
          center: new naver.maps.LatLng(school.lat, school.lng),
          radius: cfg.radius,
          map,
          strokeColor: cfg.color,
          strokeWeight: cfg.radius === 50 ? 3 : 2.5,
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
    if (!map || typeof naver === "undefined") return;
    clearTobaccoLayers();
    if (!showTobacco) return;

    const iw = new naver.maps.InfoWindow({
      content: "",
      borderWidth: 0,
      backgroundColor: "transparent",
      disableAnchor: true,
    });
    infoWindowRef.current = iw;

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

      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(shop.lat, shop.lng),
        map,
        icon: {
          content: `
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;">
              <div style="position:relative;width:28px;height:28px;">
                <div style="
                  width:28px;height:28px;
                  background:${color};border:3px solid white;
                  border-radius:6px;
                  box-shadow:0 3px 8px rgba(0,0,0,0.5);
                  display:flex;align-items:center;justify-content:center;
                  font-size:14px;line-height:1;
                ">${shopEmoji}</div>
                <div style="
                  position:absolute;top:-6px;right:-8px;
                  background:${shopTypeColor};color:white;
                  font-size:8px;font-weight:700;
                  border-radius:3px;padding:1px 3px;
                  font-family:'Noto Sans KR',sans-serif;
                  border:1px solid white;line-height:1.2;
                ">${shopTypeLabel}</div>
              </div>
              <div style="
                background:${color};color:white;border-radius:4px;
                padding:2px 6px;font-size:10px;font-family:'Noto Sans KR',sans-serif;
                font-weight:700;white-space:nowrap;
                box-shadow:0 1px 4px rgba(0,0,0,0.3);
                max-width:110px;overflow:hidden;text-overflow:ellipsis;
              ">${shortName}</div>
            </div>`,
          anchor: new naver.maps.Point(14, 14),
        },
        zIndex: 500,
      });

      naver.maps.Event.addListener(marker, "click", (e) => {
        e.stopPropagation?.();
        const popupHtml = `
          <div style="
            background:white;border-radius:10px;padding:12px 14px;min-width:180px;
            box-shadow:0 4px 16px rgba(0,0,0,0.18);
            font-family:'Noto Sans KR',sans-serif;
            border-top:4px solid ${color};
          ">
            <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#1e293b;">${shop.name}</div>
            <div style="margin-bottom:6px;">
              <span style="
                display:inline-block;background:${shopTypeColor};color:white;
                font-size:10px;font-weight:700;border-radius:4px;padding:2px 6px;
              ">${isUnmanned ? "🚬 무인전자담배자판기" : "🏪 오프라인전자담배"}</span>
            </div>
            ${shop.address ? `<p style="font-size:11px;color:#64748b;margin:0 0 6px;">${shop.address}</p>` : ""}
            <p style="font-size:12px;font-weight:600;color:${color};margin:0;">${zoneLabel}</p>
          </div>`;
        iw.setContent(popupHtml);
        iw.open(map, marker);
      });

      tobaccoLayersRef.current.push(marker);
    });
  }, [tobaccoShops, schools, showTobacco]);

  /* ── 구 하이라이트 폴리곤 ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof naver === "undefined") return;

    if (districtLayerRef.current) {
      districtLayerRef.current.setMap(null);
      districtLayerRef.current = null;
    }

    if (!districtPolygon || districtPolygon.length < 3) return;

    const paths = districtPolygon.map(([lat, lng]) => new naver.maps.LatLng(lat, lng));
    const poly = new naver.maps.Polygon({
      paths,
      map,
      strokeColor: "#2563EB",
      strokeWeight: 2,
      strokeOpacity: 0.7,
      fillColor: "#93C5FD",
      fillOpacity: 0.25,
    });

    districtLayerRef.current = poly;
  }, [districtPolygon]);

  /* ── 선택된 학교로 이동 ── */
  useEffect(() => {
    if (!mapRef.current || !selectedSchool || typeof naver === "undefined") return;
    mapRef.current.panTo(new naver.maps.LatLng(selectedSchool.lat, selectedSchool.lng));
  }, [selectedSchool]);

  /* ── 선택된 담배업소로 이동 ── */
  useEffect(() => {
    if (!mapRef.current || !selectedTobaccoShop || typeof naver === "undefined") return;
    mapRef.current.morph(
      new naver.maps.LatLng(selectedTobaccoShop.lat, selectedTobaccoShop.lng),
      16
    );
  }, [selectedTobaccoShop]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
  );
}
