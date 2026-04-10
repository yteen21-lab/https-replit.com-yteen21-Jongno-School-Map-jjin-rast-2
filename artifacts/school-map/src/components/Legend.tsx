import { School, TobaccoShop, SCHOOL_TYPE_COLORS, TOBACCO_ZONE_COLORS, SchoolType, TobaccoZone, getTobaccoZone } from "@/types/school";

interface LegendProps {
  schools: School[];
  tobaccoShops: TobaccoShop[];
  showRadius50: boolean;
  showRadius200: boolean;
  showTobacco: boolean;
  onToggleRadius50: () => void;
  onToggleRadius200: () => void;
  onToggleTobacco: () => void;
}

export default function Legend({
  schools,
  tobaccoShops,
  showRadius50,
  showRadius200,
  showTobacco,
  onToggleRadius50,
  onToggleRadius200,
  onToggleTobacco,
}: LegendProps) {
  const schoolCounts = schools.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});

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

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 space-y-4 min-w-[200px] max-h-[90vh] overflow-y-auto">
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

      {/* 반경 표시 */}
      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">반경 표시</p>
        <ul className="space-y-1.5">
          <li>
            <button
              onClick={onToggleRadius50}
              className={`flex items-center gap-2 text-sm w-full rounded-md px-2 py-1 transition-all ${
                showRadius50 ? "bg-red-50 text-red-700" : "text-slate-400"
              }`}
            >
              <span className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-red-400 bg-red-100" />
              <span>반경 50m</span>
              {showRadius50 && <span className="ml-auto text-xs">ON</span>}
            </button>
          </li>
          <li>
            <button
              onClick={onToggleRadius200}
              className={`flex items-center gap-2 text-sm w-full rounded-md px-2 py-1 transition-all ${
                showRadius200 ? "bg-blue-50 text-blue-700" : "text-slate-400"
              }`}
            >
              <span className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-blue-400 bg-blue-100" />
              <span>반경 200m</span>
              {showRadius200 && <span className="ml-auto text-xs">ON</span>}
            </button>
          </li>
        </ul>
      </div>

      {/* 무인전자담배 */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">무인전자담배</p>
          <button
            onClick={onToggleTobacco}
            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
              showTobacco ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-400"
            }`}
          >
            {showTobacco ? "ON" : "OFF"}
          </button>
        </div>
        {showTobacco && (
          <ul className="space-y-1.5">
            {tobaccoZones.map(([zone, color, label]) => (
              <li key={zone} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block w-3 h-3 rounded-sm flex-shrink-0 border border-white"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-700 text-xs">{zone} <span className="text-slate-400">({label})</span></span>
                <span className="ml-auto text-slate-400 text-xs font-mono">{tobaccoCounts[zone]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
