import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
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
  show50m?: boolean;
  show200m?: boolean;
  districtPolygon?: [number, number][];
}

const SEOUL_CENTER: L.LatLngExpression = [37.5665, 126.9780];

export default function LeafletMap({
  schools,
  tobaccoShops,
  selectedSchool,
  selectedTobaccoShop,
  onSelectSchool,
  showRadius50,
  showRadius200,
  showTobacco,
  show50m = true,
  show200m = true,
  districtPolygon,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const schoolLayerRef = useRef<L.Layer[]>([]);
  const tobaccoLayerRef = useRef<L.Layer[]>([]);
  const districtLayerRef = useRef<L.Layer | null>(null);

  const clearSchoolLayers = useCallback(() => {
    schoolLayerRef.current.forEach((l) => l.remove());
    schoolLayerRef.current = [];
  }, []);

  const clearTobaccoLayers = useCallback(() => {
    tobaccoLayerRef.current.forEach((l) => l.remove());
    tobaccoLayerRef.current = [];
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: SEOUL_CENTER,
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    map.on("click", () => onSelectSchool(null));
    mapRef.current = map;

    return () => {
      clearSchoolLayers();
      clearTobaccoLayers();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* ── 학교 마커 & 반경 원 ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    clearSchoolLayers();

    schools.forEach((school) => {
      const color = SCHOOL_TYPE_COLORS[school.type];
      const isSelected = selectedSchool?.id === school.id;
      const size = isSelected ? 20 : 14;

      const icon = L.divIcon({
        className: "",
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
            <div style="
              width:${size}px;height:${size}px;
              background:${color};border:2px solid white;border-radius:50%;
              box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer;
            "></div>
            <div style="
              background:white;border:1px solid ${color};border-radius:4px;
              padding:2px 6px;font-size:11px;font-family:'Noto Sans KR',sans-serif;
              font-weight:500;color:#1e293b;white-space:nowrap;
              box-shadow:0 1px 4px rgba(0,0,0,0.15);
            ">${school.name}</div>
          </div>`,
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([school.lat, school.lng], {
        icon,
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(map);

      marker.on("click", (e) => {
        e.originalEvent.stopPropagation();
        onSelectSchool(school);
      });

      schoolLayerRef.current.push(marker);

      CIRCLE_CONFIGS.forEach((cfg) => {
        const shouldShow =
          (cfg.radius === 50 && showRadius50) ||
          (cfg.radius === 200 && showRadius200);
        if (!shouldShow) return;

        const zoneActive = cfg.radius === 50 ? show50m : show200m;

        const circle = L.circle([school.lat, school.lng], {
          radius: cfg.radius,
          color: zoneActive ? cfg.color : "#94a3b8",
          weight: cfg.radius === 50 ? 3 : 2.5,
          opacity: zoneActive ? 1 : 0.35,
          dashArray: zoneActive ? undefined : "6 5",
          fillColor: zoneActive ? cfg.fillColor : "#e2e8f0",
          fillOpacity: zoneActive ? (cfg.radius === 50 ? 0.55 : 0.45) : 0.08,
        }).addTo(map);

        schoolLayerRef.current.push(circle);
      });
    });
  }, [schools, selectedSchool, showRadius50, showRadius200, show50m, show200m]);

  /* ── 무인담배샵 마커 ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
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

      const icon = L.divIcon({
        className: "",
        html: `
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
                border:1px solid white;
                line-height:1.2;
              ">${shopTypeLabel}</div>
            </div>
            <div style="
              background:${color};color:white;
              border-radius:4px;
              padding:2px 6px;font-size:10px;font-family:'Noto Sans KR',sans-serif;
              font-weight:700;white-space:nowrap;
              box-shadow:0 1px 4px rgba(0,0,0,0.3);
              max-width:110px;overflow:hidden;text-overflow:ellipsis;
            ">${shortName}</div>
          </div>`,
        iconAnchor: [14, 14],
      });

      const marker = L.marker([shop.lat, shop.lng], {
        icon,
        zIndexOffset: 500,
      }).addTo(map);

      const zoneLabel =
        zone === "50m이내"  ? "🔴 학교 50m 이내 (위반)" :
        zone === "200m이내" ? "🟠 학교 200m 이내 (경고)" :
                              "⚫ 학교 200m 외부 (정상)";

      marker.bindPopup(`
        <div style="font-family:'Noto Sans KR',sans-serif;min-width:160px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="font-weight:700;font-size:13px;">${shop.name}</span>
          </div>
          <div style="margin-bottom:6px;">
            <span style="
              display:inline-block;
              background:${shopTypeColor};color:white;
              font-size:10px;font-weight:700;
              border-radius:4px;padding:2px 6px;
            ">${isUnmanned ? "🚬 무인전자담배자판기" : "🏪 오프라인전자담배"}</span>
          </div>
          ${shop.address ? `<p style="font-size:11px;color:#64748b;margin:0 0 6px">${shop.address}</p>` : ""}
          <p style="font-size:12px;font-weight:600;color:${color};margin:0">${zoneLabel}</p>
        </div>
      `, { maxWidth: 240 });

      marker.on("click", (e) => e.originalEvent.stopPropagation());

      tobaccoLayerRef.current.push(marker);
    });
  }, [tobaccoShops, schools, showTobacco]);

  /* ── 구 하이라이트 폴리곤 ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (districtLayerRef.current) {
      districtLayerRef.current.remove();
      districtLayerRef.current = null;
    }

    if (!districtPolygon || districtPolygon.length < 3) return;

    const poly = L.polygon(districtPolygon as L.LatLngExpression[], {
      color: "#2563EB",
      weight: 2,
      opacity: 0.7,
      fillColor: "#93C5FD",
      fillOpacity: 0.25,
      dashArray: "6 4",
    }).addTo(map);

    districtLayerRef.current = poly;
  }, [districtPolygon]);

  useEffect(() => {
    if (!mapRef.current || !selectedSchool) return;
    mapRef.current.panTo([selectedSchool.lat, selectedSchool.lng]);
  }, [selectedSchool]);

  useEffect(() => {
    if (!mapRef.current || !selectedTobaccoShop) return;
    mapRef.current.flyTo([selectedTobaccoShop.lat, selectedTobaccoShop.lng], 16, { duration: 0.8 });
  }, [selectedTobaccoShop]);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
