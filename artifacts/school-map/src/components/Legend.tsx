import { useState } from "react";
import { School, TobaccoShop, SCHOOL_TYPE_COLORS, TOBACCO_ZONE_COLORS, SchoolType, TobaccoZone, getTobaccoZone } from "@/types/school";

interface LegendProps {
  schools: School[];
  tobaccoShops: TobaccoShop[];
  showRadius50: boolean;
  showRadius200: boolean;
  showTobacco: boolean;
  showMuIn: boolean;
  showYuIn: boolean;
  onToggleRadius50: () => void;
  onToggleRadius200: () => void;
  onToggleTobacco: () => void;
  onToggleMuIn: () => void;
  onToggleYuIn: () => void;
}

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="absolute right-full top-1/2 -translate-y-1/2 mr-2 z-[9999]
            bg-slate-800 text-white text-[11px] leading-relaxed
            rounded-lg px-3 py-2 shadow-xl w-56 pointer-events-none"
          style={{ whiteSpace: "pre-line" }}
        >
          {text}
          <div className="absolute right-[-5px] top-1/2 -translate-y-1/2 border-[5px] border-transparent border-l-slate-800" />
        </div>
      )}
    </div>
  );
}

export default function Legend({
  schools,
  tobaccoShops,
  showRadius50,
  showRadius200,
  showTobacco,
  showMuIn,
  showYuIn,
  onToggleRadius50,
  onToggleRadius200,
  onToggleTobacco,
  onToggleMuIn,
  onToggleYuIn,
}: LegendProps) {
  const schoolCounts = schools.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});

  const muInShops  = tobaccoShops.filter(s => s.shopType !== "유인");
  const yuInShops  = tobaccoShops.filter(s => s.shopType === "유인");

  const tobaccoCounts = tobaccoShops.reduce<Record<TobaccoZone, number>>(
    (acc, shop) => {
      const zone = getTobaccoZone(shop, schools);
      acc[zone] = (acc[zone] || 0) + 1;
      return acc;
    },
    { "50m이내": 0, "200m이내": 0, "외부": 0 }
  );

  const schoolTypes = Object.entries(SCHOOL_TYPE_COLORS) as [SchoolType, string][];
  const tobaccoZones: [TobaccoZone, string, string][] = [
    ["50m이내",  TOBACCO_ZONE_COLORS["50m이내"],  "위반 의심"],
    ["200m이내", TOBACCO_ZONE_COLORS["200m이내"], "주의"],
    ["외부",     TOBACCO_ZONE_COLORS["외부"],     "정상"],
  ];

  const TOOLTIP_50 = `절대보호구역 (학교보건법 제5조)\n\n학교 출입문으로부터 직선거리 50m 이내 구역.\n\n청소년 유해업소의 설치가 절대적으로 금지되며, 어떠한 예외도 허용되지 않습니다.`;
  const TOOLTIP_200 = `상대보호구역 (학교보건법 제5조)\n\n학교 경계로부터 직선거리 200m 이내 구역 (절대보호구역 제외).\n\n교육감 또는 교육장의 심의를 거쳐 유해업소 설치 여부가 결정됩니다.`;

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 space-y-4 min-w-[210px] max-h-[90vh] overflow-y-auto">
      {/* 학교 구분 */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">학교 구분</p>
        <ul className="space-y-1.5">
          {schoolTypes.map(([type, color]) => {
            const count = schoolCounts[type] || 0;
            if (count === 0) return null;
            return (
              <li key={type} className="flex items-center gap-2 text-sm">
                <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-slate-700">{type}</span>
                <span className="ml-auto text-slate-400 text-xs font-mono">{count}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 보호구역 표시 */}
      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">보호구역 표시</p>
        <ul className="space-y-1.5">
          <li>
            <Tooltip text={TOOLTIP_50}>
              <button
                onClick={onToggleRadius50}
                className={`flex items-center gap-2 text-sm w-full rounded-md px-2 py-1 transition-all ${
                  showRadius50 ? "bg-red-50 text-red-700" : "text-slate-400"
                }`}
              >
                <span className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-red-400 bg-red-100" />
                <span className="text-left leading-tight">
                  <span className="block font-semibold text-[12px]">절대보호구역</span>
                  <span className="block text-[10px] opacity-70">반경 50m</span>
                </span>
                {showRadius50 && <span className="ml-auto text-xs font-semibold">ON</span>}
              </button>
            </Tooltip>
          </li>
          <li>
            <Tooltip text={TOOLTIP_200}>
              <button
                onClick={onToggleRadius200}
                className={`flex items-center gap-2 text-sm w-full rounded-md px-2 py-1 transition-all ${
                  showRadius200 ? "bg-blue-50 text-blue-700" : "text-slate-400"
                }`}
              >
                <span className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-blue-400 bg-blue-100" />
                <span className="text-left leading-tight">
                  <span className="block font-semibold text-[12px]">상대보호구역</span>
                  <span className="block text-[10px] opacity-70">반경 200m</span>
                </span>
                {showRadius200 && <span className="ml-auto text-xs font-semibold">ON</span>}
              </button>
            </Tooltip>
          </li>
        </ul>
      </div>

      {/* 담배샵 */}
      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">담배샵</p>

        {/* 전체 표시 토글 */}
        <button
          onClick={onToggleTobacco}
          className={`flex items-center gap-2 text-sm w-full rounded-md px-2 py-1.5 transition-all mb-2 ${
            showTobacco ? "bg-orange-50 text-orange-700" : "text-slate-400"
          }`}
        >
          <span className="flex-shrink-0 w-4 h-4 rounded-sm border-2 border-orange-400 bg-orange-100 flex items-center justify-center text-[9px]">🚬</span>
          <span>업소 표시</span>
          {showTobacco
            ? <span className="ml-auto text-xs font-semibold">ON</span>
            : <span className="ml-auto text-xs">OFF</span>
          }
        </button>

        {/* 무인 / 유인 서브 토글 */}
        {showTobacco && (
          <div className="space-y-1 mb-3 pl-1">
            {/* 무인 토글 */}
            <button
              onClick={onToggleMuIn}
              className={`flex items-center gap-2 text-xs w-full rounded-md px-2 py-1.5 border transition-all ${
                showMuIn
                  ? "bg-slate-50 border-slate-300 text-slate-700"
                  : "border-dashed border-slate-200 text-slate-400"
              }`}
            >
              <span
                className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold border"
                style={{
                  background: showMuIn ? "#475569" : "#e2e8f0",
                  borderColor: showMuIn ? "#334155" : "#cbd5e1",
                  color: showMuIn ? "white" : "#94a3b8",
                }}
              >
                🚬
              </span>
              <span className="font-medium">무인전자담배자판기</span>
              <span className="ml-auto font-mono text-slate-400">{muInShops.length}</span>
              <span className={`text-[10px] font-semibold ml-1 ${showMuIn ? "text-slate-600" : "text-slate-300"}`}>
                {showMuIn ? "ON" : "OFF"}
              </span>
            </button>

            {/* 유인 토글 */}
            <button
              onClick={onToggleYuIn}
              className={`flex items-center gap-2 text-xs w-full rounded-md px-2 py-1.5 border transition-all ${
                showYuIn
                  ? "bg-purple-50 border-purple-300 text-purple-700"
                  : "border-dashed border-slate-200 text-slate-400"
              }`}
            >
              <span
                className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold border"
                style={{
                  background: showYuIn ? "#7C3AED" : "#e2e8f0",
                  borderColor: showYuIn ? "#6d28d9" : "#cbd5e1",
                  color: showYuIn ? "white" : "#94a3b8",
                }}
              >
                🏪
              </span>
              <span className="font-medium">오프라인전자담배</span>
              <span className="ml-auto font-mono text-slate-400">{yuInShops.length}</span>
              <span className={`text-[10px] font-semibold ml-1 ${showYuIn ? "text-purple-600" : "text-slate-300"}`}>
                {showYuIn ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        )}

        {/* 구역별 분포 */}
        {showTobacco && (
          <ul className="space-y-1.5 pl-1">
            {tobaccoZones.map(([zone, color, label]) => (
              <li key={zone} className="flex items-center gap-2">
                <span
                  className="inline-block w-3.5 h-3.5 rounded-sm flex-shrink-0 border-2 border-white shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-slate-700">{zone}</span>
                <span className="text-xs text-slate-400">({label})</span>
                <span className="ml-auto text-xs font-mono text-slate-500">{tobaccoCounts[zone]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
