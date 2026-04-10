import { useState, useCallback, useMemo } from "react";
import LeafletMap from "@/components/LeafletMap";
import ExcelUploader from "@/components/ExcelUploader";
import SchoolList from "@/components/SchoolList";
import Legend from "@/components/Legend";
import { School, TobaccoShop, SAMPLE_SCHOOLS, SAMPLE_TOBACCO_SHOPS, getTobaccoZone } from "@/types/school";
import { RefreshCw, School as SchoolIcon, MapPin, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

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
        className={`relative flex flex-col bg-white border-r border-slate-200 shadow-sm transition-all duration-300 z-10 ${sidebarOpen ? "w-72" : "w-0"}`}
        style={{ minWidth: sidebarOpen ? "288px" : "0px" }}
      >
        {sidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <SchoolIcon className="h-5 w-5 text-green-600" />
                <h1 className="text-base font-bold text-slate-800">학교 반경 지도</h1>
              </div>
              <p className="text-xs text-slate-400">서울시 전체 · 초중고</p>
              {violationCount > 0 && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                  <p className="text-xs text-red-700 font-semibold">⚠️ 학교 200m 이내 업소 {violationCount}곳</p>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveTab("list");
                  }}
                  placeholder="학교명, 구, 유형 검색..."
                  className="w-full pl-8 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-xs text-slate-400 mt-1.5 pl-1">
                  검색 결과 <span className="font-semibold text-green-600">{filteredSchools.length}개</span>
                  {filteredSchools.length !== schools.length && ` / 전체 ${schools.length}개`}
                </p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setActiveTab("list")}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "list" ? "text-green-600 border-b-2 border-green-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                학교 목록 ({filteredSchools.length})
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "upload" ? "text-green-600 border-b-2 border-green-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                엑셀 업로드
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "list" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">학교 클릭 시 지도 이동</p>
                    {schools !== SAMPLE_SCHOOLS && (
                      <button onClick={handleReset} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        초기화
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
            <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
              <div className="grid grid-cols-3 gap-2 text-center">
                {(["초등학교", "중학교", "고등학교"] as const).map((type) => {
                  const count = filteredSchools.filter((s) => s.type === type).length;
                  return (
                    <div key={type}>
                      <div className="text-lg font-bold text-slate-800">{count}</div>
                      <div className="text-xs text-slate-400">{type.replace("학교", "")}</div>
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
        style={{ left: sidebarOpen ? "288px" : "0px" }}
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {/* Map Area */}
      <main className="flex-1 relative">
        {/* Floating Search Bar (map overlay) */}
        {!sidebarOpen && (
          <div className="absolute top-4 left-4 z-[1000] w-72">
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

        {/* Selected school info */}
        {selectedSchool && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="bg-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-3 min-w-[240px]">
              <MapPin className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 text-sm">{selectedSchool.name}</p>
                <p className="text-xs text-slate-400">
                  {selectedSchool.district && `${selectedSchool.district} · `}{selectedSchool.type}
                </p>
              </div>
              <button onClick={() => setSelectedSchool(null)} className="ml-auto text-slate-300 hover:text-slate-500 text-lg leading-none">×</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
