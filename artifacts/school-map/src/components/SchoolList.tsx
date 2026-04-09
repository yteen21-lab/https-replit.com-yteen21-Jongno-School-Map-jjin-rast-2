import { School, SCHOOL_TYPE_COLORS } from "@/types/school";
import { MapPin } from "lucide-react";

interface SchoolListProps {
  schools: School[];
  selectedSchool: School | null;
  onSelectSchool: (school: School) => void;
}

export default function SchoolList({ schools, selectedSchool, onSelectSchool }: SchoolListProps) {
  if (schools.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        <MapPin className="mx-auto h-8 w-8 mb-2 opacity-40" />
        학교 데이터가 없습니다
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
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-semibold text-slate-600">
                {type} ({list.length})
              </span>
            </div>
            <ul className="space-y-1">
              {list.map((school) => {
                const isSelected = selectedSchool?.id === school.id;
                return (
                  <li key={school.id}>
                    <button
                      onClick={() => onSelectSchool(school)}
                      className={`
                        w-full text-left px-3 py-2 rounded-md text-sm transition-all
                        ${isSelected
                          ? "bg-blue-50 border border-blue-200 text-blue-800 font-medium"
                          : "hover:bg-slate-50 text-slate-700 border border-transparent"
                        }
                      `}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color, opacity: isSelected ? 1 : 0.6 }}
                        />
                        {school.name}
                      </span>
                      {isSelected && (
                        <span className="text-xs text-blue-500 mt-0.5 block pl-4">
                          {school.lat.toFixed(6)}, {school.lng.toFixed(6)}
                        </span>
                      )}
                    </button>
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
