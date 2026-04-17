import { useMemo } from "react";
import { X, Store, Package } from "lucide-react";
import {
  School, TobaccoShop,
  getTobaccoZone, haversineDistance, TOBACCO_ZONE_COLORS,
} from "@/types/school";

interface ZoneShopPanelProps {
  zone: "50m" | "200m";
  tobaccoShops: TobaccoShop[];
  schools: School[];
  onClose: () => void;
  onSelectShop: (shop: TobaccoShop) => void;
  fullWidth?: boolean;
}

function getNearestSchool(shop: TobaccoShop, schools: School[]): { name: string; dist: number } | null {
  if (!schools.length) return null;
  let best = { name: "", dist: Infinity };
  for (const s of schools) {
    const d = haversineDistance(shop.lat, shop.lng, s.lat, s.lng);
    if (d < best.dist) best = { name: s.name, dist: d };
  }
  return best;
}

const ZONE_CONFIG = {
  "50m": {
    label: "50m이내",
    title: "절대보호구역 (50m이내)",
    subtitle: "학교 경계선으로부터 50m 이내 — 위반 의심",
    headerBg: "bg-red-600",
    badgeBg: "bg-red-100 text-red-700 border-red-200",
    rowHover: "hover:bg-red-50",
    distColor: "text-red-600",
    emptyText: "50m 이내 담배 매장이 없습니다.",
  },
  "200m": {
    label: "200m이내",
    title: "상대보호구역 (200m이내)",
    subtitle: "학교 경계선으로부터 50~200m 이내 — 주의",
    headerBg: "bg-orange-500",
    badgeBg: "bg-orange-100 text-orange-700 border-orange-200",
    rowHover: "hover:bg-orange-50",
    distColor: "text-orange-600",
    emptyText: "50~200m 이내 담배 매장이 없습니다.",
  },
} as const;

export default function ZoneShopPanel({
  zone, tobaccoShops, schools, onClose, onSelectShop, fullWidth = false,
}: ZoneShopPanelProps) {
  const cfg = ZONE_CONFIG[zone];
  const zoneKey = cfg.label;
  const color = TOBACCO_ZONE_COLORS[zoneKey as keyof typeof TOBACCO_ZONE_COLORS];

  const shopsInZone = useMemo(
    () => tobaccoShops
      .filter((s) => getTobaccoZone(s, schools) === zoneKey)
      .map((s) => ({ shop: s, nearest: getNearestSchool(s, schools) }))
      .sort((a, b) => (a.nearest?.dist ?? 0) - (b.nearest?.dist ?? 0)),
    [tobaccoShops, schools, zoneKey],
  );

  return (
    <div className={`flex flex-col overflow-hidden bg-white text-sm border border-white/20 ${fullWidth ? "w-full h-full" : "w-72 max-h-[calc(100vh-120px)] rounded-xl shadow-2xl"}`}>
      {/* Header */}
      <div className={`${cfg.headerBg} px-3 py-2.5 flex items-start justify-between gap-2 flex-shrink-0`}>
        <div className="text-white">
          <div className="font-bold text-sm leading-tight">{cfg.title}</div>
          <div className="text-[11px] opacity-80 mt-0.5 leading-tight">{cfg.subtitle}</div>
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white hover:bg-white/20 rounded-full p-0.5 flex-shrink-0 transition-colors mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Count bar */}
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: color }}
        />
        <span className="text-slate-600 text-xs font-medium">
          총 <span className="font-bold text-slate-900">{shopsInZone.length}</span>개 매장 해당
        </span>
        <span className="ml-auto text-[10px] text-slate-400">가까운 순 정렬</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
        {shopsInZone.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
            <Store className="w-8 h-8 opacity-30" />
            <span className="text-xs">{cfg.emptyText}</span>
          </div>
        ) : (
          shopsInZone.map(({ shop, nearest }) => (
            <button
              key={shop.id}
              onClick={() => onSelectShop(shop)}
              className={`w-full text-left px-3 py-2.5 ${cfg.rowHover} transition-colors group`}
            >
              {/* Shop name + type badge */}
              <div className="flex items-center gap-1.5 mb-1">
                {shop.shopType === "무인" ? (
                  <Package className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                ) : (
                  <Store className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                )}
                <span className="font-medium text-slate-800 text-xs leading-tight truncate flex-1 group-hover:text-slate-900">
                  {shop.name}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold flex-shrink-0 ${
                  shop.shopType === "무인"
                    ? "bg-slate-100 text-slate-600 border-slate-200"
                    : "bg-purple-100 text-purple-700 border-purple-200"
                }`}>
                  {shop.shopType === "무인" ? "무인" : "유인"}
                </span>
              </div>

              {/* Address */}
              {shop.address && (
                <div className="text-[11px] text-slate-500 truncate mb-1 pl-5">
                  {shop.address}
                </div>
              )}

              {/* Nearest school & distance */}
              {nearest && (
                <div className="flex items-center gap-1 pl-5">
                  <span className="text-[10px] text-slate-400 truncate flex-1">
                    최근접: {nearest.name}
                  </span>
                  <span className={`text-[10px] font-bold flex-shrink-0 ${cfg.distColor}`}>
                    {Math.round(nearest.dist)}m
                  </span>
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
