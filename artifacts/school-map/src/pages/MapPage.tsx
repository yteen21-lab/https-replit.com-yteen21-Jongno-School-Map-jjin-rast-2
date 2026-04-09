import { useState, useCallback } from "react";
import KakaoMap from "@/components/KakaoMap";
import ExcelUploader from "@/components/ExcelUploader";
import SchoolList from "@/components/SchoolList";
import Legend from "@/components/Legend";
import { useKakaoMap } from "@/hooks/useKakaoMap";
import { School, SAMPLE_SCHOOLS } from "@/types/school";
import { Upload, RefreshCw, School as SchoolIcon, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

export default function MapPage() {
  const { isLoaded, error: mapError, debugInfo } = useKakaoMap();
  const [schools, setSchools] = useState<School[]>(SAMPLE_SCHOOLS);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showRadius50, setShowRadius50] = useState(true);
  const [showRadius200, setShowRadius200] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"upload" | "list">("list");

  const handleSchoolsLoaded = useCallback((newSchools: School[]) => {
    setSchools(newSchools);
    setSelectedSchool(null);
    setActiveTab("list");
  }, []);

  const handleReset = useCallback(() => {
    setSchools(SAMPLE_SCHOOLS);
    setSelectedSchool(null);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-korean">
      {/* Sidebar */}
      <aside
        className={`
          relative flex flex-col bg-white border-r border-slate-200 shadow-sm transition-all duration-300 z-10
          ${sidebarOpen ? "w-72" : "w-0"}
        `}
        style={{ minWidth: sidebarOpen ? "288px" : "0px" }}
      >
        {sidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <SchoolIcon className="h-5 w-5 text-blue-600" />
                <h1 className="text-base font-bold text-slate-800">학교 반경 지도</h1>
              </div>
              <p className="text-xs text-slate-400">서울시 종로구 · 초중고</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setActiveTab("list")}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "list"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                학교 목록 ({schools.length})
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "upload"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-500 hover:text-slate-700"
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
                    <p className="text-xs text-slate-500">학교를 클릭하면 지도에서 확인</p>
                    {schools !== SAMPLE_SCHOOLS && (
                      <button
                        onClick={handleReset}
                        className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        초기화
                      </button>
                    )}
                  </div>
                  <SchoolList
                    schools={schools}
                    selectedSchool={selectedSchool}
                    onSelectSchool={setSelectedSchool}
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
                  const count = schools.filter((s) => s.type === type).length;
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
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-slate-200 rounded-r-lg shadow px-1 py-3 text-slate-400 hover:text-slate-600 transition-all"
        style={{ left: sidebarOpen ? "288px" : "0px" }}
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {/* Map Area */}
      <main className="flex-1 relative">
        {mapError ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
              <MapPin className="mx-auto h-12 w-12 text-red-400 mb-3" />
              <h2 className="font-bold text-slate-800 mb-2">지도를 불러올 수 없습니다</h2>
              <p className="text-sm text-slate-500 mb-4">{mapError}</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left text-xs text-amber-800 space-y-2">
                <p className="font-semibold">확인 사항</p>
                <p>1. 카카오 개발자 콘솔에서 <strong>JavaScript 키</strong>를 사용하고 있는지 확인하세요 (REST API 키 ❌)</p>
                <p>2. 플랫폼 → Web → 사이트 도메인에 아래 주소가 등록되어 있는지 확인:</p>
                <code className="block bg-amber-100 rounded px-2 py-1 text-amber-900 font-mono break-all">
                  {window.location.origin}
                </code>
                {debugInfo && (
                  <p className="text-slate-500 mt-1">디버그: {debugInfo}</p>
                )}
              </div>
            </div>
          </div>
        ) : !isLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">카카오맵 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <KakaoMap
            schools={schools}
            selectedSchool={selectedSchool}
            onSelectSchool={setSelectedSchool}
            showRadius50={showRadius50}
            showRadius200={showRadius200}
          />
        )}

        {/* Legend overlay */}
        {isLoaded && !mapError && (
          <div className="absolute top-4 right-4 z-10">
            <Legend
              schools={schools}
              showRadius50={showRadius50}
              showRadius200={showRadius200}
              onToggleRadius50={() => setShowRadius50((v) => !v)}
              onToggleRadius200={() => setShowRadius200((v) => !v)}
            />
          </div>
        )}

        {/* Selected school info */}
        {selectedSchool && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-3 min-w-[240px]">
              <MapPin className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 text-sm">{selectedSchool.name}</p>
                <p className="text-xs text-slate-400">
                  {selectedSchool.type} · {selectedSchool.lat.toFixed(5)}, {selectedSchool.lng.toFixed(5)}
                </p>
              </div>
              <button
                onClick={() => setSelectedSchool(null)}
                className="ml-auto text-slate-300 hover:text-slate-500 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
