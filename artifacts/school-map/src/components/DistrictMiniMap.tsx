import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  School, TobaccoShop,
  SCHOOL_TYPE_COLORS, TOBACCO_ZONE_COLORS, getTobaccoZone,
} from "@/types/school";

interface DistrictMiniMapProps {
  schools: School[];
  tobaccoShops: TobaccoShop[];
}

export default function DistrictMiniMap({ schools, tobaccoShops }: DistrictMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    const bounds: L.LatLng[] = [];

    schools.forEach((school) => {
      const color = SCHOOL_TYPE_COLORS[school.type];
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:10px;height:10px;
            background:${color};
            border:2px solid white;
            border-radius:50%;
            box-shadow:0 1px 4px rgba(0,0,0,0.5);
          "></div>`,
        iconAnchor: [5, 5],
      });
      L.marker([school.lat, school.lng], { icon })
        .bindTooltip(school.name, { permanent: false, direction: "top", className: "text-xs" })
        .addTo(map);
      bounds.push(L.latLng(school.lat, school.lng));
    });

    tobaccoShops.forEach((shop) => {
      const zone = getTobaccoZone(shop, schools);
      const color = TOBACCO_ZONE_COLORS[zone];
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:9px;height:9px;
            background:${color};
            border:2px solid white;
            border-radius:2px;
            box-shadow:0 1px 4px rgba(0,0,0,0.5);
            display:flex;align-items:center;justify-content:center;
            font-size:5px;
          ">🚬</div>`,
        iconAnchor: [4, 4],
      });
      L.marker([shop.lat, shop.lng], { icon })
        .bindTooltip(shop.name, { permanent: false, direction: "top", className: "text-xs" })
        .addTo(map);
      bounds.push(L.latLng(shop.lat, shop.lng));
    });

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [14, 14] });
    }

    return () => {
      map.remove();
    };
  }, [schools, tobaccoShops]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
      className="rounded-md overflow-hidden"
    />
  );
}
