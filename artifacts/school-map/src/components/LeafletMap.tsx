import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import { School, SCHOOL_TYPE_COLORS, CIRCLE_CONFIGS } from "@/types/school";

interface LeafletMapProps {
  schools: School[];
  selectedSchool: School | null;
  onSelectSchool: (school: School | null) => void;
  showRadius50: boolean;
  showRadius200: boolean;
}

const JONGNO_CENTER: L.LatLngExpression = [37.5735, 126.979];

export default function LeafletMap({
  schools,
  selectedSchool,
  onSelectSchool,
  showRadius50,
  showRadius200,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const circlesRef = useRef<L.Circle[]>([]);

  const clearMap = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    circlesRef.current.forEach((c) => c.remove());
    markersRef.current = [];
    circlesRef.current = [];
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
      clearMap();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clearMap();

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
              background:${color};
              border:2px solid white;
              border-radius:50%;
              box-shadow:0 2px 6px rgba(0,0,0,0.4);
              cursor:pointer;
            "></div>
            <div style="
              background:white;
              border:1px solid ${color};
              border-radius:4px;
              padding:2px 6px;
              font-size:11px;
              font-family:'Noto Sans KR',sans-serif;
              font-weight:500;
              color:#1e293b;
              white-space:nowrap;
              box-shadow:0 1px 4px rgba(0,0,0,0.15);
            ">${school.name}</div>
          </div>
        `,
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

      markersRef.current.push(marker);

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

        circlesRef.current.push(circle);
      });
    });
  }, [schools, selectedSchool, showRadius50, showRadius200]);

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
