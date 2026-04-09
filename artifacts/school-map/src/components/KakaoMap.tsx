import { useEffect, useRef, useCallback } from "react";
import { School, SCHOOL_TYPE_COLORS, CIRCLE_CONFIGS } from "@/types/school";

interface KakaoMapProps {
  schools: School[];
  selectedSchool: School | null;
  onSelectSchool: (school: School | null) => void;
  showRadius50: boolean;
  showRadius200: boolean;
}

const JONGNO_CENTER = { lat: 37.5735, lng: 126.979 };

export default function KakaoMap({
  schools,
  selectedSchool,
  onSelectSchool,
  showRadius50,
  showRadius200,
}: KakaoMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);

  const clearMap = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    circlesRef.current.forEach((c) => c.setMap(null));
    overlaysRef.current.forEach((o) => o.setMap(null));
    markersRef.current = [];
    circlesRef.current = [];
    overlaysRef.current = [];
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || !window.kakao?.maps) return;

    const map = new window.kakao.maps.Map(mapContainerRef.current, {
      center: new window.kakao.maps.LatLng(JONGNO_CENTER.lat, JONGNO_CENTER.lng),
      level: 5,
    });

    mapRef.current = map;

    window.kakao.maps.event.addListener(map, "click", () => {
      onSelectSchool(null);
    });

    return () => {
      clearMap();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;

    clearMap();

    schools.forEach((school) => {
      const position = new window.kakao.maps.LatLng(school.lat, school.lng);
      const color = SCHOOL_TYPE_COLORS[school.type];
      const isSelected = selectedSchool?.id === school.id;

      const markerContent = `
        <div style="
          width: ${isSelected ? "20px" : "14px"};
          height: ${isSelected ? "20px" : "14px"};
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          cursor: pointer;
          transition: all 0.2s;
        "></div>
      `;

      const marker = new window.kakao.maps.CustomOverlay({
        position,
        content: markerContent,
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: isSelected ? 10 : 5,
      });

      marker.setMap(mapRef.current);
      markersRef.current.push(marker);

      const labelContent = `
        <div style="
          background: white;
          border: 1px solid ${color};
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          font-family: 'Noto Sans KR', sans-serif;
          font-weight: 500;
          color: #1e293b;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          margin-top: 4px;
        ">${school.name}</div>
      `;

      const label = new window.kakao.maps.CustomOverlay({
        position,
        content: labelContent,
        yAnchor: -0.3,
        xAnchor: 0.5,
        zIndex: 4,
      });
      label.setMap(mapRef.current);
      overlaysRef.current.push(label);

      const markerEl = marker.getContent();

      window.kakao.maps.event.addListener(marker, "click", () => {
        onSelectSchool(school);
      });

      CIRCLE_CONFIGS.forEach((cfg) => {
        const shouldShow =
          (cfg.radius === 50 && showRadius50) ||
          (cfg.radius === 200 && showRadius200);

        if (!shouldShow) return;

        const circle = new window.kakao.maps.Circle({
          center: position,
          radius: cfg.radius,
          strokeWeight: 2,
          strokeColor: cfg.color,
          strokeOpacity: 0.8,
          strokeStyle: "solid",
          fillColor: cfg.fillColor,
          fillOpacity: 0.25,
        });

        circle.setMap(mapRef.current);
        circlesRef.current.push(circle);
      });
    });
  }, [schools, selectedSchool, showRadius50, showRadius200]);

  useEffect(() => {
    if (!mapRef.current || !selectedSchool || !window.kakao?.maps) return;
    const pos = new window.kakao.maps.LatLng(selectedSchool.lat, selectedSchool.lng);
    mapRef.current.panTo(pos);
  }, [selectedSchool]);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height: "100%" }}
      className="rounded-lg overflow-hidden"
    />
  );
}
