import { useEffect, useRef, useCallback } from "react";
import { School, SCHOOL_TYPE_COLORS, CIRCLE_CONFIGS } from "@/types/school";

interface NaverMapProps {
  schools: School[];
  selectedSchool: School | null;
  onSelectSchool: (school: School | null) => void;
  showRadius50: boolean;
  showRadius200: boolean;
}

const JONGNO_CENTER = { lat: 37.5735, lng: 126.979 };

export default function NaverMap({
  schools,
  selectedSchool,
  onSelectSchool,
  showRadius50,
  showRadius200,
}: NaverMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);

  const clearMap = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    circlesRef.current.forEach((c) => c.setMap(null));
    markersRef.current = [];
    circlesRef.current = [];
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || !window.naver?.maps) return;

    const map = new window.naver.maps.Map(mapContainerRef.current, {
      center: new window.naver.maps.LatLng(JONGNO_CENTER.lat, JONGNO_CENTER.lng),
      zoom: 14,
      mapTypeId: window.naver.maps.MapTypeId.NORMAL,
    });

    mapRef.current = map;

    window.naver.maps.Event.addListener(map, "click", () => {
      onSelectSchool(null);
    });

    return () => {
      clearMap();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;

    clearMap();

    schools.forEach((school) => {
      const position = new window.naver.maps.LatLng(school.lat, school.lng);
      const color = SCHOOL_TYPE_COLORS[school.type];
      const isSelected = selectedSchool?.id === school.id;

      const markerHtml = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="
            width: ${isSelected ? "20px" : "14px"};
            height: ${isSelected ? "20px" : "14px"};
            background: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            cursor: pointer;
          "></div>
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
            box-shadow: 0 1px 4px rgba(0,0,0,0.15);
          ">${school.name}</div>
        </div>
      `;

      const marker = new window.naver.maps.Marker({
        position,
        map: mapRef.current,
        icon: {
          content: markerHtml,
          anchor: new window.naver.maps.Point(
            isSelected ? 10 : 7,
            isSelected ? 10 : 7
          ),
        },
        zIndex: isSelected ? 10 : 5,
      });

      markersRef.current.push(marker);

      window.naver.maps.Event.addListener(marker, "click", () => {
        onSelectSchool(school);
      });

      CIRCLE_CONFIGS.forEach((cfg) => {
        const shouldShow =
          (cfg.radius === 50 && showRadius50) ||
          (cfg.radius === 200 && showRadius200);

        if (!shouldShow) return;

        const circle = new window.naver.maps.Circle({
          map: mapRef.current,
          center: position,
          radius: cfg.radius,
          strokeColor: cfg.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: cfg.fillColor,
          fillOpacity: 0.25,
        });

        circlesRef.current.push(circle);
      });
    });
  }, [schools, selectedSchool, showRadius50, showRadius200]);

  useEffect(() => {
    if (!mapRef.current || !selectedSchool || !window.naver?.maps) return;
    const pos = new window.naver.maps.LatLng(selectedSchool.lat, selectedSchool.lng);
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
