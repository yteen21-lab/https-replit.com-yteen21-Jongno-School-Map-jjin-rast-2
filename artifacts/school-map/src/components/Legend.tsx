import { useState } from "react";
import { ChevronRight, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { School, TobaccoShop, SCHOOL_TYPE_COLORS, TOBACCO_ZONE_COLORS, SchoolType, TobaccoZone, getTobaccoZone } from "@/types/school";

interface LegendProps {
  schools: School[];
  tobaccoShops: TobaccoShop[];
  showRadius50: boolean;
  showRadius200: boolean;
  showTobacco: boolean;
  showMuIn: boolean;
  showYuIn: boolean;
  activeZonePanel: "50m" | "200m" | null;
  visibleSchoolTypes: Set<SchoolType>;
  onToggleRadius50: () => void;
  onToggleRadius200: () => void;
  onToggleTobacco: () => void;
  onToggleMuIn: () => void;
  onToggleYuIn: () => void;
  onOpenZonePanel: (zone: "50m" | "200m") => void;
  onToggleSchoolType: (type: SchoolType) => void;
  defaultCollapsed?: boolean;
  width?: number;
  height?: number;
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
  activeZonePanel,
  visibleSchoolTypes,
  onToggleRadius50,
  onToggleRadius200,
  onToggleTobacco,
  onToggleMuIn,
  onToggleYuIn,
  onOpenZonePanel,
  onToggleSchoolType,
  defaultCollapsed = false,
  width,
  height,
}: LegendProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
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
  const tobaccoZones: [TobaccoZone, string, string, string][] = [
    ["50m이내",  TOBACCO_ZONE_COLORS["50m이내"],  "절대보호구역", "50m이내 (심각)"],
    ["200m이내", TOBACCO_ZONE_COLORS["200m이내"], "상대보호구역", "200m 이내 (주의)"],
    ["외부",     TOBACCO_ZONE_COLORS["외부"],     "보호구역 밖",  ""],
  ];

  const TOOLTIP_50 = `절대보호구역 (학교보건법 제5조)\n\n학교 출입문으로부터 직선거리 50m 이내 구역.\n\n청소년 유해업소의 설치가 절대적으로 금지되며, 어떠한 예외도 허용되지 않습니다.`;
  const TOOLTIP_200 = `상대보호구역 (학교보건법 제5조)\n\n학교 경계로부터 직선거리 200m 이내 구역 (절대보호구역 제외).\n\n교육감 또는 교육장의 심의를 거쳐 유해업소 설치 여부가 결정됩니다.`;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="bg-white rounded-xl shadow-lg p-2.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <SlidersHorizontal className="w-4 h-4 text-slate-500" />
        필터
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>
    );
  }

  return (
    <div
      className="bg-white rounded-xl shadow-lg p-3 space-y-3 overflow-y-auto"
      style={{
        ...(width ? { width, minWidth: width } : { minWidth: 200 }),
        ...(height ? { height, maxHeight: height } : { maxHeight: "85vh" }),
      }}
    >
      {/* 접기 버튼 */}
      <div className="flex items-center justify-between -mb-1">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <SlidersHorizontal className="w-3 h-3" />필터
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
          title="접기"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* 학교 구분 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">학교 구분</p>
          {visibleSchoolTypes.size < schoolTypes.length && (
            <button
              onClick={() => schoolTypes.forEach(([t]) => { if (!visibleSchoolTypes.has(t)) onToggleSchoolType(t); })}
              className="text-[10px] text-slate-400 hover:text-slate-600 underline"
            >
              전체 켜기
            </button>
          )}
        </div>
        <ul className="space-y-1">
          {schoolTypes.map(([type, color]) => {
            const totalCount = schoolCounts[type] || 0;
            if (totalCount === 0) return null;
            const isOn = visibleSchoolTypes.has(type);
            return (
              <li key={type}>
                <button
                  onClick={() => onToggleSchoolType(type)}
                  className={`flex items-center gap-2 text-sm w-full rounded-md px-2 py-1.5 border transition-all text-left ${
                    isOn
                      ? "border-slate-200 hover:bg-slate-50"
                      : "border-dashed border-slate-200 opacity-50 hover:opacity-70"
                  }`}
                >
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 border-white shadow-sm transition-all"
                    style={{ backgroundColor: isOn ? color : "#cbd5e1" }}
                  />
                  <span className={isOn ? "text-slate-700" : "text-slate-400"}>{type}</span>
                  <span className={`ml-auto text-xs font-mono ${isOn ? "text-slate-400" : "text-slate-300"}`}>
                    {totalCount}
                  </span>
                  <span className={`text-[10px] font-semibold ml-1 ${isOn ? "text-slate-500" : "text-slate-300"}`}>
                    {isOn ? "ON" : "OFF"}
                  </span>
                </button>
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
          <span className="flex-shrink-0 w-4 h-4 rounded-sm border-2 border-orange-400 bg-orange-100 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 32 32" fill="none">
              <rect x="3" y="13" width="18" height="7" rx="3.5" fill="#ea580c" opacity="0.9"/>
              <rect x="5" y="15.5" width="5" height="4" rx="1" fill="#ea580c" opacity="0.4"/>
              <rect x="11" y="15.5" width="2" height="4" rx="0.8" fill="#ea580c" opacity="0.4"/>
              <rect x="21" y="14.5" width="5" height="4" rx="2" fill="#ea580c" opacity="0.6"/>
              <path d="M27.5 12 Q29 10 27.5 8 Q26 6 28 4.5" stroke="#ea580c" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" fill="none"/>
              <path d="M25 11 Q26.5 9 25 7.5" stroke="#ea580c" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" fill="none"/>
            </svg>
          </span>
          <span>액상형 전자담배 매장 표시</span>
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
                <svg width="13" height="13" viewBox="0 0 32 32" fill="none">
                  <rect x="3" y="13" width="18" height="7" rx="3.5" fill="currentColor" opacity="0.95"/>
                  <rect x="5" y="15.5" width="5" height="4" rx="1" fill="currentColor" opacity="0.35"/>
                  <rect x="11" y="15.5" width="2" height="4" rx="0.8" fill="currentColor" opacity="0.35"/>
                  <rect x="21" y="14.5" width="5" height="4" rx="2" fill="currentColor" opacity="0.7"/>
                  <rect x="2" y="15.5" width="1.5" height="3" rx="0.5" fill="currentColor" opacity="0.5"/>
                  <path d="M27.5 12 Q29 10 27.5 8 Q26 6 28 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" fill="none"/>
                  <path d="M25 11 Q26.5 9 25 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" fill="none"/>
                </svg>
              </span>
              <span className="font-medium">무인자판기 매장</span>
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
                🏬
              </span>
              <span className="font-medium">오프라인 매장</span>
              <span className="ml-auto font-mono text-slate-400">{yuInShops.length}</span>
              <span className={`text-[10px] font-semibold ml-1 ${showYuIn ? "text-purple-600" : "text-slate-300"}`}>
                {showYuIn ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        )}

        {/* 구역별 분포 */}
        {showTobacco && (
          <ul className="space-y-1 pl-1">
            {tobaccoZones.map(([zone, color, title, subtitle]) => {
              const panelKey = zone === "50m이내" ? "50m" : zone === "200m이내" ? "200m" : null;
              const isOpen = panelKey !== null && activeZonePanel === panelKey;

              const rowBase = "flex items-center gap-2 w-full rounded-md px-2 py-1.5 border transition-all text-xs";
              const activeStyle =
                zone === "50m이내"  ? "bg-red-50 border-red-300 text-red-700 shadow-sm" :
                zone === "200m이내" ? "bg-orange-50 border-orange-300 text-orange-700 shadow-sm" :
                "border-slate-100 text-slate-600";
              const idleStyle = panelKey ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "border-transparent text-slate-600";

              return panelKey ? (
                <li key={zone}>
                  <button
                    onClick={() => onOpenZonePanel(panelKey)}
                    className={`${rowBase} ${isOpen ? activeStyle : idleStyle}`}
                  >
                    <span
                      className="inline-block w-3.5 h-3.5 rounded-sm flex-shrink-0 border-2 border-white shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-bold">{title}</span>
                    <span className="opacity-60">{subtitle}</span>
                    <span className="ml-auto font-mono font-bold">{tobaccoCounts[zone]}</span>
                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                </li>
              ) : (
                <li key={zone} className={`${rowBase} border-transparent`}>
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-sm flex-shrink-0 border-2 border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-slate-700">{title}</span>
                  <span className="text-slate-400">{subtitle}</span>
                  <span className="ml-auto font-mono text-slate-500">{tobaccoCounts[zone]}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
