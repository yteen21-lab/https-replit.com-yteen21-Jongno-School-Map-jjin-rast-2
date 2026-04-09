import { School, SCHOOL_TYPE_COLORS, SchoolType } from "@/types/school";

interface LegendProps {
  schools: School[];
  showRadius50: boolean;
  showRadius200: boolean;
  onToggleRadius50: () => void;
  onToggleRadius200: () => void;
}

export default function Legend({
  schools,
  showRadius50,
  showRadius200,
  onToggleRadius50,
  onToggleRadius200,
}: LegendProps) {
  const counts = schools.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});

  const types = Object.entries(SCHOOL_TYPE_COLORS) as [SchoolType, string][];

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 space-y-4 min-w-[180px]">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">학교 구분</p>
        <ul className="space-y-1.5">
          {types.map(([type, color]) => {
            const count = counts[type] || 0;
            if (count === 0) return null;
            return (
              <li key={type} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-700">{type}</span>
                <span className="ml-auto text-slate-400 text-xs font-mono">{count}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">반경 표시</p>
        <ul className="space-y-2">
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
    </div>
  );
}
