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
  onSelectSchool: (school: School | null) => void;
  showRadius50: boolean;
  showRadius200: boolean;
  showTobacco: boolean;
}

const JONGNO_CENTER: L.LatLngExpression = [37.5735, 126.979];

export default function LeafletMap({
  schools,
  tobaccoShops,
  selectedSchool,
  onSelectSchool,
  showRadius50,
  showRadius200,
  showTobacco,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const schoolLayerRef = useRef<L.Layer[]>([]);
  const tobaccoLayerRef = useRef<L.Layer[]>([]);

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
      center: JONGNO_CENTER,
      zoom: 14,
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

        const circle = L.circle([school.lat, school.lng], {
          radius: cfg.radius,
          color: cfg.color,
          weight: 2,
          opacity: 0.8,
          fillColor: cfg.fillColor,
          fillOpacity: 0.25,
        }).addTo(map);

        schoolLayerRef.current.push(circle);
      });
    });
  }, [schools, selectedSchool, showRadius50, showRadius200]);

  /* ── 무인담배샵 마커 ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    clearTobaccoLayers();

    if (!showTobacco) return;

    tobaccoShops.forEach((shop) => {
      const zone = getTobaccoZone(shop, schools);
      const color = TOBACCO_ZONE_COLORS[zone];

      const icon = L.divIcon({
        className: "",
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;">
            <div style="
              width:16px;height:16px;
              background:${color};border:2px solid white;border-radius:3px;
              box-shadow:0 2px 6px rgba(0,0,0,0.4);
              display:flex;align-items:center;justify-content:center;
              font-size:9px;line-height:1;
            ">🚬</div>
            <div style="
              background:white;border:1px solid ${color};border-radius:4px;
              padding:2px 5px;font-size:10px;font-family:'Noto Sans KR',sans-serif;
              font-weight:500;color:#1e293b;white-space:nowrap;
              box-shadow:0 1px 4px rgba(0,0,0,0.15);
            ">${shop.name.replace("무인담배 ", "")}</div>
          </div>`,
        iconAnchor: [8, 8],
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
          <p style="font-weight:700;font-size:13px;margin:0 0 4px">${shop.name}</p>
          ${shop.address ? `<p style="font-size:11px;color:#64748b;margin:0 0 6px">${shop.address}</p>` : ""}
          <p style="font-size:12px;font-weight:600;color:${color};margin:0">${zoneLabel}</p>
        </div>
      `, { maxWidth: 220 });

      marker.on("click", (e) => e.originalEvent.stopPropagation());

      tobaccoLayerRef.current.push(marker);
    });
  }, [tobaccoShops, schools, showTobacco]);

  useEffect(() => {
    if (!mapRef.current || !selectedSchool) return;
    mapRef.current.panTo([selectedSchool.lat, selectedSchool.lng]);
  }, [selectedSchool]);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
