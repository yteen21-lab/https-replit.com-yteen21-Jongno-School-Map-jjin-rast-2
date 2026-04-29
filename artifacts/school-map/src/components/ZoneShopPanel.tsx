import { useMemo, useState } from "react";
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
    title: "절대보호구역",
    subtitle: "50m이내 (심각)",
    headerBg: "bg-red-600",
    rowHover: "hover:bg-red-50",
    distColor: "text-red-600",
    emptyText: "50m 이내 담배 매장이 없습니다.",
    activeTabBg: "bg-red-600",
  },
  "200m": {
    label: "200m이내",
    title: "상대보호구역",
    subtitle: "200m 이내 (주의)",
    headerBg: "bg-orange-500",
    rowHover: "hover:bg-orange-50",
    distColor: "text-orange-600",
    emptyText: "50~200m 이내 담배 매장이 없습니다.",
    activeTabBg: "bg-orange-500",
  },
} as const;

type ShopTypeFilter = "전체" | "무인" | "유인";

export default function ZoneShopPanel({
  zone, tobaccoShops, schools, onClose, onSelectShop, fullWidth = false,
}: ZoneShopPanelProps) {
  const cfg = ZONE_CONFIG[zone];
  const zoneKey = cfg.label;
  const color = TOBACCO_ZONE_COLORS[zoneKey as keyof typeof TOBACCO_ZONE_COLORS];

  const [typeFilter, setTypeFilter] = useState<ShopTypeFilter>("전체");

  const shopsInZone = useMemo(
    () => tobaccoShops
      .filter((s) => getTobaccoZone(s, schools) === zoneKey)
      .map((s) => ({ shop: s, nearest: getNearestSchool(s, schools) }))
      .sort((a, b) => (a.nearest?.dist ?? 0) - (b.nearest?.dist ?? 0)),
    [tobaccoShops, schools, zoneKey],
  );

  const muInCount  = shopsInZone.filter(({ shop }) => shop.shopType !== "유인").length;
  const yuInCount  = shopsInZone.filter(({ shop }) => shop.shopType === "유인").length;

  const visibleShops = useMemo(() => {
    if (typeFilter === "무인") return shopsInZone.filter(({ shop }) => shop.shopType !== "유인");
    if (typeFilter === "유인") return shopsInZone.filter(({ shop }) => shop.shopType === "유인");
    return shopsInZone;
  }, [shopsInZone, typeFilter]);

  const tabs: { key: ShopTypeFilter; label: string; count: number; icon: React.ReactNode }[] = [
    {
      key: "전체",
      label: "전체",
      count: shopsInZone.length,
      icon: <span className="text-[11px]">🚬</span>,
    },
    {
      key: "무인",
      label: "무인자판기",
      count: muInCount,
      icon: <Package className="w-3 h-3" />,
    },
    {
      key: "유인",
      label: "오프라인",
      count: yuInCount,
      icon: <Store className="w-3 h-3" />,
    },
  ];

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

      {/* 무인 / 유인 필터 탭 */}
      <div className="px-3 pt-2 pb-0 bg-slate-50 border-b border-slate-100 flex-shrink-0">
        <div className="flex gap-1.5">
          {tabs.map((tab) => {
            const isActive = typeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setTypeFilter(tab.key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-t-lg text-[11px] font-semibold transition-all border-b-2 ${
                  isActive
                    ? "border-current text-slate-900 bg-white shadow-sm"
                    : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/60"
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className={`ml-0.5 font-bold ${isActive ? "text-slate-700" : "text-slate-400"}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
          <div className="ml-auto flex items-center pb-1.5">
            <span className="text-[10px] text-slate-400">가까운 순</span>
          </div>
        </div>
      </div>

      {/* Count summary */}
      <div className="px-3 py-1.5 bg-white border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
        <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
        <span className="text-slate-500 text-[11px]">
          {typeFilter === "전체" ? "전체" : typeFilter === "무인" ? "무인자판기" : "오프라인"}{" "}
          <span className="font-bold text-slate-800">{visibleShops.length}</span>개
          {typeFilter !== "전체" && (
            <span className="text-slate-400"> / 전체 {shopsInZone.length}개</span>
          )}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
        {visibleShops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
            <Store className="w-8 h-8 opacity-30" />
            <span className="text-xs">
              {typeFilter === "무인" ? "해당 구역에 무인자판기가 없습니다." :
               typeFilter === "유인" ? "해당 구역에 오프라인 매장이 없습니다." :
               cfg.emptyText}
            </span>
          </div>
        ) : (
          visibleShops.map(({ shop, nearest }) => (
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
                  <Store className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
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
