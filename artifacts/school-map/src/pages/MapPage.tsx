import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import LeafletMap from "@/components/LeafletMap";
import ExcelUploader from "@/components/ExcelUploader";
import SchoolList, { highlight } from "@/components/SchoolList";
import Legend from "@/components/Legend";
import ZoneShopPanel from "@/components/ZoneShopPanel";
import {
  School, TobaccoShop,
  SAMPLE_SCHOOLS, SAMPLE_TOBACCO_SHOPS,
  getTobaccoZone, haversineDistance,
  SCHOOL_TYPE_COLORS, TOBACCO_ZONE_COLORS,
  computeDistrictPolygon,
} from "@/types/school";
import { RefreshCw, School as SchoolIcon, ChevronLeft, ChevronRight, Search, X, Link2, Check, CloudUpload, Cloud } from "lucide-react";
import ymcaLogo from "@assets/ymca로고_1776149746053.jpg";
import kctcreLogo from "@assets/image_1776150010933.png";
import DistrictMiniMap from "@/components/DistrictMiniMap";

const SIDEBAR_MIN = 140;
const SIDEBAR_MAX = 400;
const SIDEBAR_DEFAULT = 200;

const STORAGE_KEY_SCHOOLS = "schoolMap_schools_v1";
const STORAGE_KEY_TOBACCO = "schoolMap_tobacco_v2";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

function saveToStorage<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function clearStorage(...keys: string[]): void {
  try { keys.forEach((k) => localStorage.removeItem(k)); } catch {}
}

function LogoSection() {
  return (
    <div className="px-2 py-2 border-t border-slate-100 space-y-1.5">
      <div className="bg-white border border-slate-100 rounded-lg px-2 py-1.5 flex items-center justify-center">
        <img
          src={ymcaLogo}
          alt="서울YMCA"
          className="w-full object-contain"
          style={{ maxHeight: "80px" }}
        />
      </div>
      <div className="bg-white border border-slate-100 rounded-lg px-2 py-1.5 flex items-center justify-center">
        <img
          src={kctcreLogo}
          alt="한국담배규제연구교육센터"
          className="w-full object-contain"
          style={{ maxHeight: "52px" }}
        />
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
    <div
      className="absolute bottom-6 right-4 z-[1000] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      style={{ width: "260px", height: "260px" }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between flex-shrink-0"
        style={{ background: "linear-gradient(135deg,#1e293b,#334155)" }}
      >
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight">{district}</p>
          <p className="text-slate-300 text-[10px] leading-tight truncate">{school.name}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none ml-2 flex-shrink-0">×</button>
      </div>

      {/* Mini Map */}
      <div className="flex-1 relative">
        <DistrictMiniMap schools={distSchools} tobaccoShops={distTobacco} />

        {/* Legend overlay on mini-map */}
        <div className="absolute top-1.5 left-1.5 z-[2000] bg-white/90 backdrop-blur-sm rounded-md px-1.5 py-1 shadow text-[8px] space-y-0.5">
          {(["초등학교","중학교","고등학교"] as const).map((type) => (
            <div key={type} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: SCHOOL_TYPE_COLORS[type] }} />
              <span className="text-slate-700">{type.replace("학교","")} {schoolCounts[type]}</span>
            </div>
          ))}
          <div className="border-t border-slate-200 mt-0.5 pt-0.5 space-y-0.5">
            {(["50m이내","200m이내","외부"] as const).map((zone) => (
              tobaccoCounts[zone] > 0 && (
                <div key={zone} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: TOBACCO_ZONE_COLORS[zone] }} />
                  <span className="text-slate-700">🚬{zone} {tobaccoCounts[zone]}</span>
                </div>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Count bar at bottom */}
      <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50 grid grid-cols-5 divide-x divide-slate-200">
        {(["초등학교","중학교","고등학교"] as const).map((type) => (
          <div key={type} className="text-center py-1.5">
            <div className="text-xs font-bold" style={{ color: SCHOOL_TYPE_COLORS[type] }}>{schoolCounts[type]}</div>
            <div className="text-[7px] text-slate-400">{type.replace("학교","")}</div>
          </div>
        ))}
        <div className="text-center py-1.5">
          <div className="text-xs font-bold text-slate-600">{distTobacco.filter(s => s.shopType !== "유인").length}</div>
          <div className="text-[7px] text-slate-400">무인</div>
        </div>
        <div className="text-center py-1.5">
          <div className="text-xs font-bold text-purple-600">{distTobacco.filter(s => s.shopType === "유인").length}</div>
          <div className="text-[7px] text-slate-400">유인</div>
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  const [schools, setSchools] = useState<School[]>(() =>
    loadFromStorage<School[]>(STORAGE_KEY_SCHOOLS, SAMPLE_SCHOOLS)
  );
  const [tobaccoShops, setTobaccoShops] = useState<TobaccoShop[]>(() =>
    loadFromStorage<TobaccoShop[]>(STORAGE_KEY_TOBACCO, SAMPLE_TOBACCO_SHOPS)
  );
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [selectedTobaccoShop, setSelectedTobaccoShop] = useState<TobaccoShop | null>(null);
  const [showRadius50, setShowRadius50] = useState(true);
  const [showRadius200, setShowRadius200] = useState(true);
  const [showTobacco, setShowTobacco] = useState(true);
  const [showMuIn, setShowMuIn] = useState(true);
  const [showYuIn, setShowYuIn] = useState(true);
  const [activeZonePanel, setActiveZonePanel] = useState<null | "50m" | "200m">(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [activeTab, setActiveTab] = useState<"upload" | "list">("list");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [serverSynced, setServerSynced] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isResizing = useRef(false);
  /* 최신 상태를 handleSave에서 안전하게 읽기 위한 ref */
  const schoolsRef = useRef(schools);
  const tobaccoRef = useRef(tobaccoShops);
  useEffect(() => { schoolsRef.current = schools; }, [schools]);
  useEffect(() => { tobaccoRef.current = tobaccoShops; }, [tobaccoShops]);

  /* 서버에서 공유 데이터 로드 */
  useEffect(() => {
    fetch("/api/school-map-data")
      .then((r) => {
        if (!r.ok) return null;
        return r.json() as Promise<{ schools: School[]; tobacco: TobaccoShop[]; savedAt: string }>;
      })
      .then((data) => {
        if (!data) return;
        setSchools(data.schools);
        setTobaccoShops(data.tobacco);
        setServerSynced(true);
        setSavedAt(data.savedAt ? new Date(data.savedAt).toLocaleTimeString("ko-KR") : null);
      })
      .catch(() => { /* 서버 없으면 로컬 데이터 사용 */ });
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(Math.max(e.clientX, SIDEBAR_MIN), SIDEBAR_MAX);
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => { isResizing.current = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, []);

  const isCustomSchools  = schools.some(s => s.id.startsWith("excel-"));
  const isCustomTobacco  = tobaccoShops.some(s => s.id.startsWith("excel-"));

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

  const filteredTobaccoShops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return tobaccoShops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.address?.toLowerCase().includes(q) ?? false) ||
        (s.shopType === "유인" ? "오프라인매장" : "무인자판기").includes(q)
    );
  }, [tobaccoShops, searchQuery]);

  const violationCount = useMemo(
    () => tobaccoShops.filter((s) => getTobaccoZone(s, schools) !== "외부").length,
    [tobaccoShops, schools]
  );

  const visibleTobaccoShops = useMemo(
    () => tobaccoShops.filter((s) => s.shopType === "유인" ? showYuIn : showMuIn),
    [tobaccoShops, showMuIn, showYuIn]
  );

  const districtPolygon = useMemo((): [number, number][] | undefined => {
    if (!selectedSchool?.district) return undefined;
    const distSchools = schools.filter((s) => s.district === selectedSchool.district);
    return computeDistrictPolygon(distSchools);
  }, [selectedSchool, schools]);

  const handleSchoolsLoaded = useCallback((newSchools: School[]) => {
    setSchools((prev) => {
      const merged = [...prev, ...newSchools];
      saveToStorage(STORAGE_KEY_SCHOOLS, merged);
      return merged;
    });
    setSelectedSchool(null);
    setActiveTab("list");
    setSearchQuery("");
  }, []);

  const handleTobaccoShopsLoaded = useCallback((newShops: TobaccoShop[]) => {
    setTobaccoShops((prev) => {
      const merged = [...prev, ...newShops];
      saveToStorage(STORAGE_KEY_TOBACCO, merged);
      return merged;
    });
  }, []);

  const handleReset = useCallback(() => {
    setSchools(SAMPLE_SCHOOLS);
    setTobaccoShops(SAMPLE_TOBACCO_SHOPS);
    clearStorage(STORAGE_KEY_SCHOOLS, STORAGE_KEY_TOBACCO);
    setSelectedSchool(null);
    setSearchQuery("");
    setSavedAt(null);
  }, []);

  const handleSave = useCallback(() => {
    const currentSchools = schoolsRef.current;
    const currentTobacco = tobaccoRef.current;

    /* 1. 로컬 저장 */
    saveToStorage(STORAGE_KEY_SCHOOLS, currentSchools);
    saveToStorage(STORAGE_KEY_TOBACCO, currentTobacco);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
    setSavedAt(timeStr);
    setSaveError(null);

    /* 2. 서버 저장 → 공유 가능 */
    fetch("/api/school-map-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schools: currentSchools, tobacco: currentTobacco }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ ok: boolean }>;
      })
      .then((res) => {
        if (res.ok) {
          setServerSynced(true);
          setSaveError(null);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setSaveError(`서버 저장 실패: ${msg}`);
      });
  }, []);

  const handleSelectSchool = useCallback((school: School) => {
    setSelectedSchool(school);
    setSelectedTobaccoShop(null);
    setSidebarOpen(true);
  }, []);

  const handleSelectTobaccoShop = useCallback((shop: TobaccoShop) => {
    setSelectedTobaccoShop(shop);
    setSelectedSchool(null);
    setSidebarOpen(true);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-korean">
      {/* Sidebar */}
      <aside
        className="relative flex flex-col bg-white border-r border-slate-200 shadow-sm z-10"
        style={{ width: sidebarOpen ? `${sidebarWidth}px` : "0px", minWidth: sidebarOpen ? `${sidebarWidth}px` : "0px", transition: isResizing.current ? "none" : "width 0.3s, min-width 0.3s" }}
      >
        {sidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden" style={{ width: `${sidebarWidth}px` }}>
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
                  placeholder="학교·담배샵 검색..."
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
                  학교 <span className="font-semibold text-green-600">{filteredSchools.length}개</span>
                  {tobaccoShops.length > 0 && <> · 담배샵 <span className="font-semibold text-orange-500">{filteredTobaccoShops.length}개</span></>}
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
                    {isCustomSchools && (
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

                  {/* 담배샵 검색 결과 */}
                  {searchQuery && filteredTobaccoShops.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs">🚬</span>
                        <span className="text-xs font-semibold text-slate-600">담배 업소 ({filteredTobaccoShops.length})</span>
                      </div>
                      <ul className="space-y-1">
                        {filteredTobaccoShops.map((shop) => {
                          const isSelected = selectedTobaccoShop?.id === shop.id;
                          const isYuIn = shop.shopType === "유인";
                          return (
                            <li key={shop.id}>
                              <button
                                onClick={() => handleSelectTobaccoShop(shop)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${
                                  isSelected
                                    ? "bg-orange-50 border border-orange-300 text-orange-800 font-medium"
                                    : "hover:bg-slate-50 text-slate-700 border border-transparent"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-[10px]">{isYuIn ? "🏪" : "🚬"}</span>
                                  <span className="text-[11px] leading-tight">
                                    {highlight(shop.name, searchQuery)}
                                  </span>
                                  <span className={`text-[9px] px-1 rounded flex-shrink-0 ${isYuIn ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500"}`}>
                                    {isYuIn ? "유인" : "무인"}
                                  </span>
                                </span>
                                {shop.address && (
                                  <span className="text-[10px] text-slate-400 mt-0.5 block pl-5">
                                    {highlight(shop.address, searchQuery)}
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {searchQuery && tobaccoShops.length > 0 && filteredTobaccoShops.length === 0 && filteredSchools.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs">담배 업소 검색 결과 없음</div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-[10px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-600">현재 데이터 현황</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleSave}
                          className="text-[9px] bg-blue-500 hover:bg-blue-600 text-white rounded px-1.5 py-0.5 font-semibold transition-colors flex items-center gap-0.5"
                        >
                          <CloudUpload className="w-2.5 h-2.5" />
                          저장·공유
                        </button>
                        <button
                          onClick={handleReset}
                          className="text-[9px] text-red-400 hover:text-red-600 underline"
                        >
                          초기화
                        </button>
                      </div>
                    </div>
                    <div className="text-slate-600 space-y-0.5">
                      <p>• 학교: 샘플 {SAMPLE_SCHOOLS.length}개
                        {isCustomSchools && <span className="text-blue-600 font-semibold"> + 추가 {schools.filter(s => s.id.startsWith("excel-")).length}개 = 총 {schools.length}개</span>}
                      </p>
                      <p>• 담배샵: 샘플 {SAMPLE_TOBACCO_SHOPS.length}개
                        {isCustomTobacco && <span className="text-blue-600 font-semibold"> + 추가 {tobaccoShops.filter(s => s.id.startsWith("excel-")).length}개 = 총 {tobaccoShops.length}개</span>}
                      </p>
                    </div>

                    {/* 서버 동기화 상태 */}
                    {savedAt && serverSynced ? (
                      <div className="mt-1.5 flex items-center gap-1 text-emerald-600">
                        <Cloud className="w-2.5 h-2.5" />
                        <span>{savedAt} 서버 저장 완료 — URL 공유 시 동일 데이터가 표시됩니다</span>
                      </div>
                    ) : savedAt && !serverSynced ? (
                      <p className="text-blue-500 mt-1">✓ {savedAt} 로컬 저장됨</p>
                    ) : (
                      <p className="text-slate-400 mt-1">새 파일 업로드 후 저장·공유 버튼을 누르세요</p>
                    )}

                    {saveError && <p className="text-red-400 mt-1">{saveError}</p>}

                    {/* 공유 링크 복사 */}
                    {serverSynced && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href).then(() => {
                            setCopyDone(true);
                            setTimeout(() => setCopyDone(false), 2000);
                          });
                        }}
                        className="mt-1.5 w-full flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded py-1 font-semibold transition-colors"
                      >
                        {copyDone
                          ? <><Check className="w-2.5 h-2.5" /> 링크 복사됨!</>
                          : <><Link2 className="w-2.5 h-2.5" /> 공유 링크 복사</>
                        }
                      </button>
                    )}
                  </div>
                  <ExcelUploader
                    onSchoolsLoaded={handleSchoolsLoaded}
                    onTobaccoShopsLoaded={handleTobaccoShopsLoaded}
                  />
                </div>
              )}
            </div>

            {/* Stats Footer */}
            <div className="border-t border-slate-100 px-2 py-2 bg-slate-50 flex-shrink-0">
              <div className="grid grid-cols-3 gap-1 text-center mb-1.5">
                {(["초등학교","중학교","고등학교"] as const).map((type) => {
                  const count = filteredSchools.filter((s) => s.type === type).length;
                  return (
                    <div key={type}>
                      <div className="text-sm font-bold" style={{ color: SCHOOL_TYPE_COLORS[type] }}>{count}</div>
                      <div className="text-[9px] text-slate-400">{type.replace("학교","")}</div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-200 pt-1.5">
                <p className="text-[9px] text-slate-400 font-semibold text-center mb-1">🚬 담배샵</p>
                <div className="grid grid-cols-2 gap-1 text-center">
                  <div>
                    <div className="text-sm font-bold text-slate-600">{tobaccoShops.filter(s => s.shopType !== "유인").length}</div>
                    <div className="text-[9px] text-slate-400">무인</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-orange-500">{tobaccoShops.filter(s => s.shopType === "유인").length}</div>
                    <div className="text-[9px] text-slate-400">유인</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Drag-to-resize handle */}
            <div
              onMouseDown={() => {
                isResizing.current = true;
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
              }}
              className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-30 group"
            >
              <div className="h-full w-full bg-transparent group-hover:bg-green-400/40 transition-colors" />
              <div className="absolute top-1/2 -translate-y-1/2 right-0 flex flex-col gap-0.5 pr-[1px] pointer-events-none">
                {[0,1,2].map(i => <div key={i} className="w-0.5 h-3 bg-slate-300 group-hover:bg-green-500 rounded-full transition-colors" />)}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="absolute top-1/2 -translate-y-1/2 z-20 bg-white border border-slate-200 rounded-r-lg shadow px-1 py-3 text-slate-400 hover:text-slate-600"
        style={{ left: sidebarOpen ? `${sidebarWidth}px` : "0px", transition: isResizing.current ? "none" : "left 0.3s" }}
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
          tobaccoShops={visibleTobaccoShops}
          selectedSchool={selectedSchool}
          selectedTobaccoShop={selectedTobaccoShop}
          onSelectSchool={setSelectedSchool}
          showRadius50={showRadius50}
          showRadius200={showRadius200}
          showTobacco={showTobacco}
          districtPolygon={districtPolygon}
        />

        {/* Legend + ZoneShopPanel overlay */}
        <div className="absolute top-4 right-4 z-[1000] flex items-start gap-2">
          {/* Zone Shop Panel — left of legend */}
          {activeZonePanel && (
            <ZoneShopPanel
              zone={activeZonePanel}
              tobaccoShops={tobaccoShops}
              schools={schools}
              onClose={() => setActiveZonePanel(null)}
              onSelectShop={(shop) => {
                setSelectedTobaccoShop(shop);
                setActiveZonePanel(null);
              }}
            />
          )}

          <Legend
            schools={filteredSchools}
            tobaccoShops={tobaccoShops}
            showRadius50={showRadius50}
            showRadius200={showRadius200}
            showTobacco={showTobacco}
            showMuIn={showMuIn}
            showYuIn={showYuIn}
            activeZonePanel={activeZonePanel}
            onToggleRadius50={() => setShowRadius50((v) => !v)}
            onToggleRadius200={() => setShowRadius200((v) => !v)}
            onToggleTobacco={() => setShowTobacco((v) => !v)}
            onToggleMuIn={() => setShowMuIn((v) => !v)}
            onToggleYuIn={() => setShowYuIn((v) => !v)}
            onOpenZonePanel={(zone) =>
              setActiveZonePanel((prev) => prev === zone ? null : zone)
            }
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
