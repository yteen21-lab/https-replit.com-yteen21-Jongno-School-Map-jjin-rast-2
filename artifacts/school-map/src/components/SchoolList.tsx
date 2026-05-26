import { School, SCHOOL_TYPE_COLORS } from "@/types/school";
import { MapPin, Pencil } from "lucide-react";
import { highlight } from "@/utils/highlight";

interface SchoolListProps {
  schools: School[];
  selectedSchool: School | null;
  onSelectSchool: (school: School) => void;
  onEditSchool?: (school: School) => void;
  query?: string;
}

export default function SchoolList({ schools, selectedSchool, onSelectSchool, onEditSchool, query = "" }: SchoolListProps) {
  if (schools.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        <MapPin className="mx-auto h-8 w-8 mb-2 opacity-40" />
        {query ? `"${query}" 검색 결과 없음` : "학교 데이터가 없습니다"}
      </div>
    );
  }

  const grouped = schools.reduce<Record<string, School[]>>((acc, school) => {
    const key = school.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(school);
    return acc;
  }, {});

  const typeOrder = ["초등학교", "중학교", "고등학교", "기타"];

  return (
    <div className="space-y-3">
      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const color = SCHOOL_TYPE_COLORS[type as keyof typeof SCHOOL_TYPE_COLORS];
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs font-semibold text-slate-600">{type} ({list.length})</span>
            </div>
            <ul className="space-y-1">
              {list.map((school) => {
                const isSelected = selectedSchool?.id === school.id;
                return (
                  <li key={school.id} className="group relative">
                    <button
                      onClick={() => onSelectSchool(school)}
                      className={`
                        w-full text-left px-3 py-2 pr-8 rounded-md text-sm transition-all
                        ${isSelected
                          ? "bg-blue-50 border border-blue-200 text-blue-800 font-medium"
                          : "hover:bg-slate-50 text-slate-700 border border-transparent"
                        }
                      `}
                    >
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color, opacity: isSelected ? 1 : 0.6 }} />
                        <span>{highlight(school.name, query)}</span>
                      </span>
                      {school.district && (
                        <span className="text-xs text-slate-400 mt-0.5 block pl-4">
                          {highlight(school.district, query)}
                        </span>
                      )}
                    </button>
                    {onEditSchool && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditSchool(school); }}
                        title="수정"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2
                          opacity-40 group-hover:opacity-100 transition-opacity
                          p-1.5 rounded active:bg-slate-200 hover:bg-slate-200 text-slate-400 hover:text-slate-600 active:text-slate-600"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
