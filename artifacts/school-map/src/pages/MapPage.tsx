import { useState, useCallback, useMemo } from "react";
import LeafletMap from "@/components/LeafletMap";
import ExcelUploader from "@/components/ExcelUploader";
import SchoolList from "@/components/SchoolList";
import Legend from "@/components/Legend";
import {
  School, TobaccoShop,
  SAMPLE_SCHOOLS, SAMPLE_TOBACCO_SHOPS,
  getTobaccoZone, haversineDistance,
  SCHOOL_TYPE_COLORS, TOBACCO_ZONE_COLORS,
} from "@/types/school";
import { RefreshCw, School as SchoolIcon, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

const SIDEBAR_W = 160;

function LogoSection() {
  return (
    <div className="px-2 py-2 border-t border-slate-100 space-y-1.5">
      <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg p-1.5">
        <div
          className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-white font-black text-sm"
          style={{ background: "linear-gradient(135deg,#1a56a8,#3b82f6)" }}
        >
          Y
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold text-blue-900 leading-tight">서울YMCA</p>
          <p className="text-[8px] text-blue-500 leading-tight">© 2024 Seoul YMCA</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-lg p-1.5">
        <div
          className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-white font-bold text-[8px] leading-tight text-center"
          style={{ background: "linear-gradient(135deg,#166534,#22c55e)" }}
        >
          담배<br/>규제
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold text-green-900 leading-tight">한국담배규제<br/>연구교육센터</p>
          <p className="text-[8px] text-green-500 leading-tight">© 2024 KTREC</p>
        </div>
      </div>
    </div>
  );
}

interface DistrictPanelProps {
  school: School;
  allSchools: School[];
  tobaccoShops: TobaccoShop[];
  onClose: () => void;
}

function DistrictPanel({ school, allSchools, tobaccoShops, onClose }: DistrictPanelProps) {
  const district = school.district ?? "기타";
  const distSchools = allSchools.filter((s) => s.district === district);

  const distTobacco = tobaccoShops.filter((shop) => {
    let minDist = Infinity;
    let nearestDistrict = "";
    for (const s of allSchools) {
      const d = haversineDistance(shop.lat, shop.lng, s.lat, s.lng);
      if (d < minDist) { minDist = d; nearestDistrict = s.district ?? ""; }
    }
    return nearestDistrict === district;
  });

  const schoolCounts: Record<string, number> = {
    초등학교: distSchools.filter((s) => s.type === "초등학교").length,
    중학교:   distSchools.filter((s) => s.type === "중학교").length,
    고등학교: distSchools.filter((s) => s.type === "고등학교").length,
  };

  const tobaccoCounts: Record<string, number> = { "50m이내": 0, "200m이내": 0, "외부": 0 };
  distTobacco.forEach((shop) => {
    tobaccoCounts[getTobaccoZone(shop, distSchools)]++;
  });

  return (
    <div className="absolute bottom-6 right-4 z-[1000] w-52 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 flex items-start justify-between" style={{ background: "linear-gradient(135deg,#1e293b,#334155)" }}>
        <div>
          <p className="text-white font-bold text-sm leading-tight">{district}</p>
          <p className="text-slate-300 text-[11px] leading-tight mt-0.5">{school.name}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none ml-2">×</button>
      </div>

      <div className="p-3 space-y-3">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">학교 현황</p>
          <div className="grid grid-cols-3 gap-1">
            {(["초등학교","중학교","고등학교"] as const).map((type) => (
              <div key={type} className="text-center bg-slate-50 rounded-lg py-1.5">
                <div
                  className="text-base font-bold"
                  style={{ color: SCHOOL_TYPE_COLORS[type] }}
                >
                  {schoolCounts[type]}
                </div>
                <div className="text-[9px] text-slate-500">{type.replace("학교","")}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">전자담배샵</p>
          <div className="space-y-1">
            {(["50m이내","200m이내","외부"] as const).map((zone) => (
              <div key={zone} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: TOBACCO_ZONE_COLORS[zone] }}
                />
                <span className="text-[10px] text-slate-600 flex-1">{zone}</span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: TOBACCO_ZONE_COLORS[zone] }}
                >
                  {tobaccoCounts[zone]}곳
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] text-slate-500">합계</span>
            <span className="text-[11px] font-bold text-slate-700">{distTobacco.length}곳</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  const [schools, setSchools] = useState<School[]>(SAMPLE_SCHOOLS);
  const [tobaccoShops] = useState<TobaccoShop[]>(SAMPLE_TOBACCO_SHOPS);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showRadius50, setShowRadius50] = useState(true);
  const [showRadius200, setShowRadius200] = useState(true);
  const [showTobacco, setShowTobacco] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"upload" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSchools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.type.includes(q) ||
        (s.district?.toLowerCase().includes(q) ?? false)
    );
  }, [schools, searchQuery]);

  const violationCount = useMemo(
    () => tobaccoShops.filter((s) => getTobaccoZone(s, schools) !== "외부").length,
    [tobaccoShops, schools]
  );

  const handleSchoolsLoaded = useCallback((newSchools: School[]) => {
    setSchools(newSchools);
    setSelectedSchool(null);
    setActiveTab("list");
    setSearchQuery("");
  }, []);

  const handleReset = useCallback(() => {
    setSchools(SAMPLE_SCHOOLS);
    setSelectedSchool(null);
    setSearchQuery("");
  }, []);

  const handleSelectSchool = useCallback((school: School) => {
    setSelectedSchool(school);
    setSidebarOpen(true);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-korean">
      {/* Sidebar */}
      <aside
        className="relative flex flex-col bg-white border-r border-slate-200 shadow-sm transition-all duration-300 z-10"
        style={{ width: sidebarOpen ? `${SIDEBAR_W}px` : "0px", minWidth: sidebarOpen ? `${SIDEBAR_W}px` : "0px" }}
      >
        {sidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden" style={{ width: `${SIDEBAR_W}px` }}>
            {/* Header */}
            <div className="px-3 py-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 mb-0.5">
                <SchoolIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                <h1 className="text-xs font-bold text-slate-800 leading-tight">학교 반경 지도</h1>
              </div>
              <p className="text-[9px] text-slate-400">서울시 전체 · 초중고</p>
              {violationCount > 0 && (
                <div className="mt-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                  <p className="text-[9px] text-red-700 font-semibold">⚠️ 200m 이내 {violationCount}곳</p>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="px-2 py-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setActiveTab("list"); }}
                  placeholder="학교·구 검색..."
                  className="w-full pl-6 pr-6 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-[9px] text-slate-400 mt-1 pl-0.5">
                  <span className="font-semibold text-green-600">{filteredSchools.length}개</span> 결과
                </p>
              )}
            </div>

            {/* Logo Section */}
            <LogoSection />

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setActiveTab("list")}
                className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
                  activeTab === "list" ? "text-green-600 border-b-2 border-green-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                목록 ({filteredSchools.length})
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
                  activeTab === "upload" ? "text-green-600 border-b-2 border-green-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                업로드
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-2">
              {activeTab === "list" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-slate-500">클릭 시 이동</p>
                    {schools !== SAMPLE_SCHOOLS && (
                      <button onClick={handleReset} className="text-[9px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5">
                        <RefreshCw className="h-2.5 w-2.5" />초기화
                      </button>
                    )}
                  </div>
                  <SchoolList
                    schools={filteredSchools}
                    selectedSchool={selectedSchool}
                    onSelectSchool={handleSelectSchool}
                    query={searchQuery}
                  />
                </div>
              ) : (
                <ExcelUploader onSchoolsLoaded={handleSchoolsLoaded} />
              )}
            </div>

            {/* Stats Footer */}
            <div className="border-t border-slate-100 px-2 py-2 bg-slate-50">
              <div className="grid grid-cols-3 gap-1 text-center">
                {(["초등학교","중학교","고등학교"] as const).map((type) => {
                  const count = filteredSchools.filter((s) => s.type === type).length;
                  return (
                    <div key={type}>
                      <div className="text-sm font-bold text-slate-800">{count}</div>
                      <div className="text-[9px] text-slate-400">{type.replace("학교","")}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="absolute top-1/2 -translate-y-1/2 z-20 bg-white border border-slate-200 rounded-r-lg shadow px-1 py-3 text-slate-400 hover:text-slate-600 transition-all"
        style={{ left: sidebarOpen ? `${SIDEBAR_W}px` : "0px" }}
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {/* Map Area */}
      <main className="flex-1 relative">
        {/* Floating Search Bar */}
        {!sidebarOpen && (
          <div className="absolute top-4 left-4 z-[1000] w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="학교명, 구, 유형 검색..."
                className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-slate-200 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs text-white bg-black/50 rounded-lg px-2 py-1 mt-1 backdrop-blur-sm">
                {filteredSchools.length}개 결과
              </p>
            )}
          </div>
        )}

        <LeafletMap
          schools={filteredSchools}
          tobaccoShops={tobaccoShops}
          selectedSchool={selectedSchool}
          onSelectSchool={setSelectedSchool}
          showRadius50={showRadius50}
          showRadius200={showRadius200}
          showTobacco={showTobacco}
        />

        {/* Legend overlay */}
        <div className="absolute top-4 right-4 z-[1000]">
          <Legend
            schools={filteredSchools}
            tobaccoShops={tobaccoShops}
            showRadius50={showRadius50}
            showRadius200={showRadius200}
            showTobacco={showTobacco}
            onToggleRadius50={() => setShowRadius50((v) => !v)}
            onToggleRadius200={() => setShowRadius200((v) => !v)}
            onToggleTobacco={() => setShowTobacco((v) => !v)}
          />
        </div>

        {/* District Info Panel (bottom-right, square) */}
        {selectedSchool && (
          <DistrictPanel
            school={selectedSchool}
            allSchools={schools}
            tobaccoShops={tobaccoShops}
            onClose={() => setSelectedSchool(null)}
          />
        )}
      </main>
    </div>
  );
}
