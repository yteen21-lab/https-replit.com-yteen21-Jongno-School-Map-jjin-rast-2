import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import LeafletMap from "@/components/LeafletMap";
import ExcelUploader from "@/components/ExcelUploader";
import SchoolList from "@/components/SchoolList";
import { highlight } from "@/utils/highlight";
import Legend from "@/components/Legend";
import ZoneShopPanel from "@/components/ZoneShopPanel";
import EditPanel from "@/components/EditPanel";
import {
  School, TobaccoShop, SchoolType,
  SAMPLE_TOBACCO_SHOPS,
  getTobaccoZone, haversineDistance,
  SCHOOL_TYPE_COLORS, TOBACCO_ZONE_COLORS,
  computeDistrictPolygon,
  isSchoolDup, isTobaccoDup,
} from "@/types/school";
import { RefreshCw, School as SchoolIcon, ChevronLeft, ChevronRight, Search, X, Link2, Check, CloudUpload, Cloud, Pencil, Trash2, Lock, Unlock, Eye, History, LayoutDashboard } from "lucide-react";
import ymcaLogo from "@assets/image_1778548237468.png";
import kctcreLogo from "@assets/image_1776150010933.png";
import DistrictMiniMap from "@/components/DistrictMiniMap";
import ChangelogModal from "@/components/ChangelogModal";
import AdminDashboard from "@/components/AdminDashboard";

const SIDEBAR_MIN = 140;
const SIDEBAR_MAX = 400;
const SIDEBAR_DEFAULT = 200;
const MOBILE_SHEET_HANDLE_H = 52; // 모바일 바텀시트 핸들 영역 높이 (px)

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

/** 앱 최초 로드 시 구 샘플 데이터(s1~s104) 제거 + 중복 제거 후 저장 */
function migrateSampleSchools(): School[] {
  const raw = loadFromStorage<School[]>(STORAGE_KEY_SCHOOLS, []);
  const withoutSamples = raw.filter((s) => !/^s\d+$/.test(s.id));
  const accepted: School[] = [];
  for (const s of withoutSamples) {
    if (!isSchoolDup(s, accepted)) accepted.push(s);
  }
  if (accepted.length !== raw.length) {
    saveToStorage(STORAGE_KEY_SCHOOLS, accepted);
  }
  return accepted;
}

/** 기존 저장된 담배 업소 데이터에서 좌표/이름 기반 중복을 제거 */
function deduplicateTobaccoShops(): TobaccoShop[] {
  const raw = loadFromStorage<TobaccoShop[]>(STORAGE_KEY_TOBACCO, []);
  const accepted: TobaccoShop[] = [];
  for (const s of raw) {
    if (!isTobaccoDup(s, accepted)) accepted.push(s);
  }
  if (accepted.length !== raw.length) {
    console.info(`[dedup] 담배샵 중복 ${raw.length - accepted.length}개 제거 (${raw.length} → ${accepted.length})`);
    saveToStorage(STORAGE_KEY_TOBACCO, accepted);
  }
  return accepted;
}

function schoolScore(s: School, tokens: string[]): number | null {
  if (tokens.length === 0) return 0;
  const name = s.name.toLowerCase();
  const type = s.type.toLowerCase();
  const dist = (s.district ?? "").toLowerCase();

  /* 모든 토큰이 최소 하나의 필드에 매칭되어야 함 (AND 조건) */
  const allMatch = tokens.every(
    (t) => name.includes(t) || type.includes(t) || dist.includes(t)
  );
  if (!allMatch) return null;

  let score = 0;
  for (const t of tokens) {
    if (name === t) score += 300;              /* 완전 일치 */
    else if (name.startsWith(t)) score += 150; /* 이름 앞부분 일치 */
    else if (name.includes(t)) score += 80;    /* 이름 중간 포함 */
    if (dist.includes(t)) score += 10;
    if (type.includes(t)) score += 5;
  }
  return score;
}

function LogoSection() {
  return (
    <div className="px-2 py-1.5 border-t border-slate-100 flex items-center justify-center gap-3 bg-white">
      <img
        src={ymcaLogo}
        alt="서울YMCA"
        className="object-contain"
        style={{ height: "28px", width: "auto" }}
      />
      <div className="w-px h-5 bg-slate-200" />
      <img
        src={kctcreLogo}
        alt="한국담배규제연구교육센터"
        className="object-contain"
        style={{ height: "23px", width: "auto" }}
      />
    </div>
  );
}

interface DistrictPanelProps {
  school: School;
  allSchools: School[];
  tobaccoShops: TobaccoShop[];
  onClose: () => void;
  onEdit?: (school: School) => void;
  onDelete?: (id: string) => void;
  isMobile?: boolean;
}

function DistrictPanel({ school, allSchools, tobaccoShops, onClose, onEdit, onDelete, isMobile }: DistrictPanelProps) {
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
    유치원:   distSchools.filter((s) => s.type === "유치원").length,
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
      className={
        isMobile
          ? "relative w-full flex flex-col overflow-hidden"
          : "absolute bottom-6 right-4 z-[1000] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      }
      style={isMobile ? { maxHeight: "70vh" } : { width: "260px", height: "260px" }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2 flex-shrink-0"
        style={{ background: "linear-gradient(135deg,#1e293b,#334155)" }}
      >
        {/* 학교명·구 */}
        <div className="min-w-0 flex-1">
          <p className="text-white font-bold text-sm leading-tight truncate">{school.name}</p>
          <p className="text-slate-300 text-[10px] leading-tight">{school.type} · {district}</p>
        </div>

        {/* 수정 버튼 — 관리자만 */}
        {onEdit && (
          <button
            onClick={() => onEdit(school)}
            title="학교 정보 수정"
            className="flex-shrink-0 flex items-center gap-1 text-[10px] text-slate-200 hover:text-white bg-white/10 hover:bg-white/25 rounded px-1.5 py-1 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            수정
          </button>
        )}

        {/* 삭제 버튼 — 관리자만 */}
        {onDelete && (
          <button
            onClick={() => {
              if (window.confirm(`"${school.name}"을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
                onDelete(school.id);
                onClose();
              }
            }}
            title="학교 삭제"
            className="flex-shrink-0 flex items-center gap-1 text-[10px] text-slate-200 hover:text-red-300 bg-white/10 hover:bg-red-500/25 rounded px-1.5 py-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            삭제
          </button>
        )}

        {/* 닫기 */}
        <button onClick={onClose} className="flex-shrink-0 text-slate-400 hover:text-white text-lg leading-none ml-1">×</button>
      </div>

      {/* Body: 모바일=통계카드 / 데스크톱=미니맵 */}
      {isMobile ? (
        /* 모바일: 구 통계 카드 */
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-white">
          {/* 구 배지 */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">위치</span>
            <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
              서울시 {district !== "기타" ? district : "구 정보 없음"}
            </span>
          </div>

          {/* 학교 현황 */}
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <p className="text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              {district !== "기타" ? `${district} 학교 현황` : "학교 현황"}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {(["유치원","초등학교","중학교","고등학교"] as const).map((type) => (
                <div key={type} className="bg-white rounded-md py-2 flex flex-col items-center shadow-sm">
                  <span className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: SCHOOL_TYPE_COLORS[type] }} />
                  <span className="text-base font-bold text-slate-800">{schoolCounts[type]}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 담배 판매점 현황 */}
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <p className="text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              {district !== "기타" ? `${district} 담배 판매점` : "담배 판매점"}
            </p>
            <div className="space-y-1">
              {([
                { zone: "50m이내",  title: "절대보호구역", subtitle: "50m이내 (심각)" },
                { zone: "200m이내", title: "상대보호구역", subtitle: "200m 이내 (주의)" },
                { zone: "외부",     title: "보호구역 밖",  subtitle: "" },
              ] as const).map(({ zone, title, subtitle }) => (
                <div key={zone} className="flex items-center justify-between bg-white rounded-md px-2.5 py-1.5 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: TOBACCO_ZONE_COLORS[zone] }} />
                    <span className="text-[10px] font-bold text-slate-700">{title}</span>
                    <span className="text-[10px] text-slate-400">{subtitle}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{tobaccoCounts[zone]}</span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-white rounded-md px-2.5 py-1.5 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">🏪</span>
                  <span className="text-[10px] text-slate-600">전체</span>
                </div>
                <span className="text-sm font-bold text-slate-800">{distTobacco.length}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 데스크톱: 미니맵 */
        <div className="flex-1 relative">
          <DistrictMiniMap schools={distSchools} tobaccoShops={distTobacco} />
          <div className="absolute top-1.5 left-1.5 z-[2000] bg-white/90 backdrop-blur-sm rounded-md px-1.5 py-1 shadow text-[8px] space-y-0.5">
            {(["유치원","초등학교","중학교","고등학교"] as const).map((type) => (
              <div key={type} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: SCHOOL_TYPE_COLORS[type] }} />
                <span className="text-slate-700">{type} {schoolCounts[type]}</span>
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
      )}

      {/* Count bar at bottom */}
      <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50 grid grid-cols-6 divide-x divide-slate-200">
        {(["유치원","초등학교","중학교","고등학교"] as const).map((type) => (
          <div key={type} className="text-center py-1.5">
            <div className="text-xs font-bold" style={{ color: SCHOOL_TYPE_COLORS[type] }}>{schoolCounts[type]}</div>
            <div className="text-[7px] text-slate-400">{type}</div>
          </div>
        ))}
        <div className="text-center py-1.5">
          <div className="text-xs font-bold text-slate-600">{distTobacco.filter(s => s.shopType !== "유인").length}</div>
          <div className="text-[7px] text-slate-400">무인자판기</div>
        </div>
        <div className="text-center py-1.5">
          <div className="text-xs font-bold text-purple-600">{distTobacco.filter(s => s.shopType === "유인").length}</div>
          <div className="text-[7px] text-slate-400">오프라인</div>
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  const [schools, setSchools] = useState<School[]>(() =>
    migrateSampleSchools()
  );
  const [tobaccoShops, setTobaccoShops] = useState<TobaccoShop[]>(() =>
    deduplicateTobaccoShops()
  );
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [selectedTobaccoShop, setSelectedTobaccoShop] = useState<TobaccoShop | null>(null);
  const [showRadius50, setShowRadius50] = useState(true);
  const [showRadius200, setShowRadius200] = useState(true);
  const [showTobacco, setShowTobacco] = useState(true);
  const [showMuIn, setShowMuIn] = useState(true);
  const [showYuIn, setShowYuIn] = useState(true);
  const [tobaccoVersion, setTobaccoVersion] = useState(0);
  const [activeZonePanel, setActiveZonePanel] = useState<null | "50m" | "200m">(null);
  const [visibleSchoolTypes, setVisibleSchoolTypes] = useState<Set<SchoolType>>(
    () => new Set<SchoolType>(["유치원", "초등학교", "중학교", "고등학교", "기타"])
  );
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [activeTab, setActiveTab] = useState<"upload" | "list">("list");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [serverSynced, setServerSynced] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const serverEtagRef = useRef<string>(""); /* 마지막으로 받은 ETag 저장 */
  const [copyDone, setCopyDone] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editTarget, setEditTarget] = useState<
    | { kind: "school"; item: School }
    | { kind: "tobacco"; item: TobaccoShop }
    | null
  >(null);
  const [addSchoolMode, setAddSchoolMode] = useState(false);
  const [addTobaccoMode, setAddTobaccoMode] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  /* 관리자 모드 */
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem("adminMode") === "1");
  const [adminName, setAdminName] = useState(() => sessionStorage.getItem("adminName") ?? "");
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem("adminToken") ?? "");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showChangelog, setShowChangelog] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  /* 자동 저장 */
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dataInitialized = useRef(false);
  const isAdminRef = useRef(isAdmin);
  const isResizing = useRef(false);
  const touchStartY = useRef(0);
  /* 최신 상태를 handleSave에서 안전하게 읽기 위한 ref */
  const schoolsRef = useRef(schools);
  const tobaccoRef = useRef(tobaccoShops);
  useEffect(() => { schoolsRef.current = schools; }, [schools]);
  useEffect(() => { tobaccoRef.current = tobaccoShops; }, [tobaccoShops]);

  /* isAdminRef 동기화 */
  useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);

  /* 화면 크기 변경 감지 */
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  /* 서버에서 공유 데이터 로드 — 없으면 로컬 데이터를 자동 업로드 */
  useEffect(() => {
    fetch("/api/school-map-data", {
      headers: { "Accept-Encoding": "gzip, deflate, br" },
    })
      .then(async (r) => {
        if (r.ok) {
          /* ETag 저장 — 이후 폴링에서 변경 감지에 사용 */
          const etag = r.headers.get("etag");
          if (etag) serverEtagRef.current = etag;
          /* 서버에 데이터가 있으면 그걸 사용 */
          const data = await r.json() as { schools: School[]; tobacco: TobaccoShop[]; savedAt: string };
          /* GCS 데이터에도 이름·좌표 기반 중복 제거 적용 */
          const dedupSchools = (list: School[]): School[] => {
            const acc: School[] = [];
            for (const s of list) { if (!isSchoolDup(s, acc)) acc.push(s); }
            return acc;
          };
          const dedupTobacco = (list: TobaccoShop[]): TobaccoShop[] => {
            const acc: TobaccoShop[] = [];
            for (const s of list) { if (!isTobaccoDup(s, acc)) acc.push(s); }
            return acc;
          };
          setSchools(dedupSchools(data.schools));
          setTobaccoShops(dedupTobacco(data.tobacco));
          setServerSynced(true);
          setSavedAt(data.savedAt ? new Date(data.savedAt).toLocaleTimeString("ko-KR") : null);
        } else {
          /* 서버에 데이터 없음 → 로컬 데이터가 있으면 자동 push (모바일 공유를 위해) */
          const localSchools  = migrateSampleSchools();
          const localTobacco  = loadFromStorage<TobaccoShop[]>(STORAGE_KEY_TOBACCO, []);
          const hasLocalData  = localSchools.length > 0 || localTobacco.length > 0;
          if (hasLocalData) {
            fetch("/api/school-map-data", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ schools: localSchools, tobacco: localTobacco }),
            })
              .then((pr) => {
                if (pr.ok) {
                  setServerSynced(true);
                  setSavedAt(new Date().toLocaleTimeString("ko-KR"));
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => { /* 서버 연결 불가 → 로컬 데이터 그대로 유지 */ })
      .finally(() => {
        /* 초기 로드 완료 — 이후 변경부터 자동 저장 허용 */
        setTimeout(() => { dataInitialized.current = true; }, 500);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 뷰어 폴링 — 30초마다 서버 데이터 변경 확인 (관리자 모드엔 불필요) */
  useEffect(() => {
    const POLL_INTERVAL = 30_000;

    const poll = async () => {
      if (isAdminRef.current) return; /* 관리자는 직접 저장하므로 폴링 불필요 */
      try {
        const headers: Record<string, string> = { "Accept-Encoding": "gzip, deflate, br" };
        if (serverEtagRef.current) headers["If-None-Match"] = serverEtagRef.current;

        const r = await fetch("/api/school-map-data", { headers });

        if (r.status === 304) return; /* 데이터 미변경 — 아무 것도 안 함 */

        if (r.ok) {
          const newEtag = r.headers.get("etag");
          if (newEtag && newEtag === serverEtagRef.current) return; /* 혹시 ETag 없어도 이중 확인 */
          if (newEtag) serverEtagRef.current = newEtag;

          const data = await r.json() as { schools: School[]; tobacco: TobaccoShop[]; savedAt: string };
          setSchools(data.schools ?? []);
          setTobaccoShops(data.tobacco ?? []);
          if (data.savedAt) setSavedAt(new Date(data.savedAt).toLocaleTimeString("ko-KR"));
        }
      } catch { /* 네트워크 오류는 무시 */ }
    };

    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 관리자 자동 저장 — 데이터 변경 1.5초 후 서버 push */
  useEffect(() => {
    if (!dataInitialized.current) return;
    if (!isAdminRef.current) return;

    setAutoSaveStatus("saving");
    const timer = setTimeout(() => {
      const s = schoolsRef.current;
      const t = tobaccoRef.current;
      /* 로컬 저장 */
      saveToStorage(STORAGE_KEY_SCHOOLS, s);
      saveToStorage(STORAGE_KEY_TOBACCO, t);

      const _tok = sessionStorage.getItem("adminToken");
      fetch("/api/school-map-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(_tok ? { Authorization: `Bearer ${_tok}` } : {}) },
        body: JSON.stringify({ schools: s, tobacco: t }),
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<{ ok: boolean }>;
        })
        .then((res) => {
          if (res.ok) {
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
            setSavedAt(timeStr);
            setServerSynced(true);
            setSaveError(null);
            setAutoSaveStatus("saved");
            setTimeout(() => setAutoSaveStatus("idle"), 3000);
          }
        })
        .catch(() => {
          setAutoSaveStatus("error");
          setTimeout(() => setAutoSaveStatus("idle"), 5000);
        });
    }, 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools, tobaccoShops]);

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

  /* 공백으로 분리된 검색 토큰 목록 */
  const searchTokens = useMemo(() => {
    return searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  }, [searchQuery]);

  const filteredSchools = useMemo(() => {
    let result = schools.filter((s) => visibleSchoolTypes.has(s.type));
    if (searchTokens.length === 0) return result;

    const scored = result
      .map((s) => ({ s, score: schoolScore(s, searchTokens) }))
      .filter(({ score }) => score !== null) as Array<{ s: School; score: number }>;

    scored.sort((a, b) => b.score - a.score);
    return scored.map(({ s }) => s);
  }, [schools, searchTokens, visibleSchoolTypes]);

  const filteredTobaccoShops = useMemo(() => {
    if (searchTokens.length === 0) return [];
    return tobaccoShops.filter((s) => {
      const name = s.name.toLowerCase();
      const addr = (s.address ?? "").toLowerCase();
      const kind = (s.shopType === "유인" ? "유인 오프라인 매장" : "무인 자판기").toLowerCase();
      return searchTokens.every(
        (t) => name.includes(t) || addr.includes(t) || kind.includes(t)
      );
    });
  }, [tobaccoShops, searchTokens]);

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

  /* 관리자 토큰을 Authorization 헤더로 반환 */
  function getAuthHeaders(): Record<string, string> {
    const tok = sessionStorage.getItem("adminToken");
    return tok ? { "Content-Type": "application/json", Authorization: `Bearer ${tok}` } : { "Content-Type": "application/json" };
  }

  const autoSyncToServer = useCallback((schools: School[], tobacco: TobaccoShop[]) => {
    fetch("/api/school-map-data", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ schools, tobacco }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ ok: boolean; savedAt: string }>;
      })
      .then((res) => {
        if (res.ok) {
          setServerSynced(true);
          setSaveError(null);
          setSavedAt(new Date(res.savedAt).toLocaleTimeString("ko-KR"));
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setSaveError(`자동 서버 저장 실패: ${msg}`);
      });
  }, []);

  const handleAdminLogin = useCallback(async () => {
    setAdminError("");
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: adminPwInput }),
      });
      const data = await res.json() as { ok: boolean; adminName?: string; token?: string; error?: string };
      if (res.ok && data.ok && data.token) {
        sessionStorage.setItem("adminMode", "1");
        sessionStorage.setItem("adminName", data.adminName ?? "관리자");
        sessionStorage.setItem("adminToken", data.token);
        setIsAdmin(true);
        setAdminName(data.adminName ?? "관리자");
        setAdminToken(data.token);
        setShowAdminModal(false);
        setAdminPwInput("");
        setSearchQuery("");
      } else {
        setAdminError(data.error ?? "코드가 올바르지 않습니다.");
      }
    } catch {
      setAdminError("서버 연결에 실패했습니다.");
    }
  }, [adminPwInput]);

  const handleAdminLogout = useCallback(() => {
    const token = sessionStorage.getItem("adminToken");
    if (token) {
      fetch("/api/admin-logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    sessionStorage.removeItem("adminMode");
    sessionStorage.removeItem("adminName");
    sessionStorage.removeItem("adminToken");
    setIsAdmin(false);
    setAdminName("");
    setAdminToken("");
  }, []);

  const handleReset = useCallback(() => {
    if (!window.confirm(`⚠️ 전체 초기화\n\n학교 데이터와 담배샵 데이터가 모두 삭제되며 서버에서도 즉시 제거됩니다.\n\n정말 삭제하시겠습니까?`)) return;
    setSchools([]);
    setTobaccoShops([]);
    clearStorage(STORAGE_KEY_SCHOOLS, STORAGE_KEY_TOBACCO);
    setSelectedSchool(null);
    setSearchQuery("");
    setSavedAt(null);
  }, []);

  const handleResetSchools = useCallback(() => {
    if (!window.confirm(`⚠️ 학교 전체 삭제\n\n등록된 학교 데이터가 모두 삭제되며 서버에서도 즉시 제거됩니다.\n\n정말 삭제하시겠습니까?`)) return;
    setSchools([]);
    clearStorage(STORAGE_KEY_SCHOOLS);
    setSelectedSchool(null);
    setSearchQuery("");
  }, []);

  const handleResetTobacco = useCallback(() => {
    if (!window.confirm(`⚠️ 담배샵 전체 삭제\n\n등록된 담배샵 데이터가 모두 삭제되며 서버에서도 즉시 제거됩니다.\n\n정말 삭제하시겠습니까?`)) return;
    setTobaccoShops([]);
    clearStorage(STORAGE_KEY_TOBACCO);
  }, []);

  const handleDeleteLastSchoolUpload = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setSchools((prev) => {
      const next = prev.filter((s) => !idSet.has(s.id));
      saveToStorage(STORAGE_KEY_SCHOOLS, next);
      return next;
    });
  }, []);

  const handleDeleteLastTobaccoUpload = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setTobaccoShops((prev) => {
      const next = prev.filter((s) => !idSet.has(s.id));
      saveToStorage(STORAGE_KEY_TOBACCO, next);
      return next;
    });
  }, []);

  /* 수정 패널 열기 */
  const handleEditSchool = useCallback((school: School) => {
    setEditTarget({ kind: "school", item: school });
  }, []);

  const handleEditTobaccoShop = useCallback((shop: TobaccoShop) => {
    setEditTarget({ kind: "tobacco", item: shop });
  }, []);

  /* 수정 저장 */
  const handleSaveSchool = useCallback((updated: School) => {
    const next = schoolsRef.current.map((s) => s.id === updated.id ? updated : s);
    saveToStorage(STORAGE_KEY_SCHOOLS, next);
    setSchools(next);
    setSelectedSchool((prev) => prev?.id === updated.id ? updated : prev);
    autoSyncToServer(next, tobaccoRef.current);
  }, []);

  const handleSaveTobacco = useCallback((updated: TobaccoShop) => {
    const next = tobaccoRef.current.map((s) => s.id === updated.id ? updated : s);
    saveToStorage(STORAGE_KEY_TOBACCO, next);
    setTobaccoShops(next);
    setSelectedTobaccoShop((prev) => prev?.id === updated.id ? updated : prev);
    setTobaccoVersion((v) => v + 1);
    autoSyncToServer(schoolsRef.current, next);
  }, []);

  /* 삭제 */
  const handleDeleteSchool = useCallback((id: string) => {
    const next = schoolsRef.current.filter((s) => s.id !== id);
    saveToStorage(STORAGE_KEY_SCHOOLS, next);
    setSchools(next);
    setSelectedSchool((prev) => prev?.id === id ? null : prev);
    autoSyncToServer(next, tobaccoRef.current);
  }, []);

  const handleDeleteTobacco = useCallback((id: string) => {
    const next = tobaccoRef.current.filter((s) => s.id !== id);
    saveToStorage(STORAGE_KEY_TOBACCO, next);
    setTobaccoShops(next);
    setSelectedTobaccoShop((prev) => prev?.id === id ? null : prev);
    setTobaccoVersion((v) => v + 1);
    autoSyncToServer(schoolsRef.current, next);
  }, []);

  /* 지도 클릭으로 학교 추가 → localStorage + 서버 자동 동기화 */
  const handleAddSchoolFromMap = useCallback((school: Omit<School, "id">) => {
    const newSchool: School = { ...school, id: `map-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };

    /* 현재 목록 + 신규 학교 */
    const updatedSchools = [...schoolsRef.current, newSchool];
    const currentTobacco = tobaccoRef.current;

    /* 1. 로컬 저장 + 상태 업데이트 */
    saveToStorage(STORAGE_KEY_SCHOOLS, updatedSchools);
    setSchools(updatedSchools);
    setSelectedSchool(newSchool);

    /* 2. 서버에도 즉시 저장 → 공유 URL에 반영 */
    fetch("/api/school-map-data", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ schools: updatedSchools, tobacco: currentTobacco }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ ok: boolean; savedAt: string }>;
      })
      .then((res) => {
        if (res.ok) {
          setServerSynced(true);
          setSaveError(null);
          setSavedAt(new Date(res.savedAt).toLocaleTimeString("ko-KR"));
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setSaveError(`자동 서버 저장 실패: ${msg}`);
      });
  }, []);

  /* 지도 클릭으로 담배샵 추가 → localStorage + 서버 자동 동기화 */
  const handleAddTobaccoFromMap = useCallback((shop: Omit<TobaccoShop, "id">) => {
    const newShop: TobaccoShop = { ...shop, id: `map-t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    const updatedTobacco = [...tobaccoRef.current, newShop];
    const currentSchools = schoolsRef.current;

    saveToStorage(STORAGE_KEY_TOBACCO, updatedTobacco);
    setTobaccoShops(updatedTobacco);

    fetch("/api/school-map-data", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ schools: currentSchools, tobacco: updatedTobacco }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ ok: boolean; savedAt: string }>;
      })
      .then((res) => {
        if (res.ok) {
          setServerSynced(true);
          setSaveError(null);
          setSavedAt(new Date(res.savedAt).toLocaleTimeString("ko-KR"));
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setSaveError(`자동 서버 저장 실패: ${msg}`);
      });
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
      headers: getAuthHeaders(),
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
      {/* 모바일 오버레이 배경 */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-[19] bg-black/30 backdrop-blur-[1px]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — 데스크톱: 좌측 패널 / 모바일: 하단 시트 */}
      <aside
        className={
          isMobile
            ? "fixed bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out"
            : "relative flex flex-col bg-white border-r border-slate-200 shadow-sm z-10"
        }
        style={
          isMobile
            ? {
                height: "78vh",
                transform: sidebarOpen ? "translateY(0)" : `translateY(calc(100% - ${MOBILE_SHEET_HANDLE_H}px))`,
              }
            : {
                width: sidebarOpen ? `${sidebarWidth}px` : "0px",
                minWidth: sidebarOpen ? `${sidebarWidth}px` : "0px",
                transition: isResizing.current ? "none" : "width 0.3s, min-width 0.3s",
              }
        }
        onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => {
          const dy = touchStartY.current - e.changedTouches[0].clientY;
          if (Math.abs(dy) > 40) setSidebarOpen(dy > 0);
        }}
      >
        {/* 모바일 핸들 바 */}
        {isMobile && (
          <button
            className="flex-shrink-0 flex flex-col items-center pt-2 pb-1 w-full"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="사이드바 열기/닫기"
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mb-1" />
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <SchoolIcon className="w-3.5 h-3.5 text-green-600" />
              액상형 전자담배 매장 지도<br />(서울, 경기)
              {violationCount > 0 && (
                <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                  ⚠ {violationCount}곳
                </span>
              )}
            </div>
          </button>
        )}

        {(sidebarOpen || !isMobile) && (
          <div className="flex flex-col overflow-hidden" style={isMobile ? { flex: 1 } : { height: "100%", width: `${sidebarWidth}px` }}>
            {/* Header — 데스크톱만 표시 (모바일은 핸들 바가 역할 대체) */}
            {!isMobile && (
              <div className="px-3 py-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <SchoolIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <h1 className="text-xs font-bold text-slate-800 leading-tight">액상형 전자담배 매장 지도<br />(서울, 경기)</h1>
                </div>
                <p className="text-[9px] text-slate-400">경기도 및 서울시 · 유치원, 초, 중, 고</p>
                {violationCount > 0 && (
                  <div className="mt-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                    <p className="text-[9px] text-red-700 font-semibold">⚠️ 200m 이내 {violationCount}곳</p>
                  </div>
                )}
              </div>
            )}

            {/* Search Bar */}
            <div className="px-2 py-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setActiveTab("list"); }}
                  placeholder="학교명, 매장명"
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
              {isAdmin && (
                <button
                  onClick={() => setActiveTab("upload")}
                  className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
                    activeTab === "upload" ? "text-green-600 border-b-2 border-green-600" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  업로드
                </button>
              )}
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
                    onEditSchool={isAdmin ? handleEditSchool : undefined}
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
                            <li key={shop.id} className="group relative">
                              <button
                                onClick={() => handleSelectTobaccoShop(shop)}
                                className={`w-full text-left px-3 py-2 pr-8 rounded-md text-sm transition-all ${
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
                              {isAdmin && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEditTobaccoShop(shop); }}
                                  title="수정"
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2
                                    opacity-0 group-hover:opacity-100 transition-opacity
                                    p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
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
                      {isAdmin && (
                        <button
                          onClick={handleSave}
                          className="text-[9px] bg-blue-500 hover:bg-blue-600 text-white rounded px-1.5 py-0.5 font-semibold transition-colors flex items-center gap-0.5"
                        >
                          <CloudUpload className="w-2.5 h-2.5" />
                          저장·공유
                        </button>
                      )}
                    </div>
                    <div className="text-slate-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <p>• 학교: {schools.length > 0
                          ? <span className="text-blue-600 font-semibold">총 {schools.length}개</span>
                          : <span className="text-slate-400">없음</span>}
                        </p>
                        {isAdmin && schools.length > 0 && (
                          <button
                            onClick={handleResetSchools}
                            className="text-[9px] text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 rounded px-1 py-0.5 transition-colors"
                          >
                            학교 전체 삭제
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p>• 담배샵: {tobaccoShops.length > 0
                          ? <span className="text-blue-600 font-semibold">총 {tobaccoShops.length}개</span>
                          : <span className="text-slate-400">없음</span>}
                        </p>
                        {isAdmin && tobaccoShops.length > 0 && (
                          <button
                            onClick={handleResetTobacco}
                            className="text-[9px] text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 rounded px-1 py-0.5 transition-colors"
                          >
                            담배샵 전체 삭제
                          </button>
                        )}
                      </div>
                      {isAdmin && (schools.length > 0 || tobaccoShops.length > 0) && (
                        <button
                          onClick={handleReset}
                          className="w-full mt-0.5 text-[9px] text-red-500 hover:text-red-700 border border-red-200 hover:border-red-500 rounded py-0.5 transition-colors bg-red-50 hover:bg-red-100 font-semibold"
                        >
                          전체 초기화 (학교 + 담배샵)
                        </button>
                      )}
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
                      <p className="text-slate-400 mt-1">새 파일 업로드 후 자동 저장됩니다</p>
                    )}
                    {isAdmin && (
                      <p className="mt-1 text-[8px] text-slate-400 flex items-center gap-0.5">
                        <Cloud className="w-2 h-2" />
                        관리자 모드: 데이터 변경 시 자동 저장됩니다
                      </p>
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
                    existingSchools={schools}
                    existingTobacco={tobaccoShops}
                    onDeleteLastSchoolUpload={handleDeleteLastSchoolUpload}
                    onDeleteLastTobaccoUpload={handleDeleteLastTobaccoUpload}
                  />
                </div>
              )}
            </div>

            {/* Stats Footer */}
            <div className="border-t border-slate-100 px-2 py-2 bg-slate-50 flex-shrink-0">
              <div className="grid grid-cols-4 gap-1 text-center mb-1.5">
                {(["유치원","초등학교","중학교","고등학교"] as const).map((type) => {
                  const count = filteredSchools.filter((s) => s.type === type).length;
                  return (
                    <div key={type}>
                      <div className="text-sm font-bold" style={{ color: SCHOOL_TYPE_COLORS[type] }}>{count}</div>
                      <div className="text-[9px] text-slate-400">{type}</div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-200 pt-1.5">
                <p className="text-[9px] text-slate-400 font-semibold text-center mb-1">🚬 액상형 전자담배 매장</p>
                <div className="grid grid-cols-2 gap-1 text-center">
                  <div>
                    <div className="text-sm font-bold text-slate-600">{tobaccoShops.filter(s => s.shopType !== "유인").length}</div>
                    <div className="text-[9px] text-slate-400">무인 자판기 매장</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-orange-500">{tobaccoShops.filter(s => s.shopType === "유인").length}</div>
                    <div className="text-[9px] text-slate-400">오프라인 매장</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 출처 표기 */}
            <div className="border-t border-slate-100 px-3 py-1.5 bg-white flex-shrink-0 space-y-0.5">
              <p className="text-[9px] text-slate-400 leading-tight text-center">
                경기도 학교·유치원:{" "}
                <a href="https://www.data.go.kr/data/15037485/fileData.do" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">공공데이터포털</a>
              </p>
              <p className="text-[9px] text-slate-400 leading-tight text-center">(갱신 25.08.26)</p>
              <p className="text-[9px] text-slate-400 leading-tight text-center">
                서울시 학교·유치원:{" "}
                <a href="https://data.seoul.go.kr" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">서울열린데이터광장</a>
              </p>
              <p className="text-[9px] text-slate-400 leading-tight text-center">(갱신 26.05.02)</p>
              <p className="text-[9px] text-slate-400 leading-tight text-center">
                전자담배: 한국담배규제연구교육센터
              </p>
              <p className="text-[9px] text-slate-400 leading-tight text-center">제작: 서울YMCA</p>
            </div>

            {/* Drag-to-resize handle — 데스크톱만 */}
            {!isMobile && (
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
            )}
          </div>
        )}
      </aside>

      {/* Sidebar Toggle — 데스크톱만 */}
      {!isMobile && (
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="absolute top-1/2 -translate-y-1/2 z-20 bg-white border border-slate-200 rounded-r-lg shadow px-1 py-3 text-slate-400 hover:text-slate-600"
          style={{ left: sidebarOpen ? `${sidebarWidth}px` : "0px", transition: isResizing.current ? "none" : "left 0.3s" }}
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      )}

      {/* Map Area */}
      <main className="flex-1 relative">
        {/* Floating Search Bar */}
        {/* 플로팅 검색창: 데스크톱에서 사이드바 닫혔을 때 / 모바일에서 항상 */}
        {(!sidebarOpen || isMobile) && (
          <div
            className="absolute top-4 z-[1000]"
            style={{ left: "1rem", right: isMobile ? "4.5rem" : "auto", width: isMobile ? "auto" : "16rem" }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); if (isMobile) setSidebarOpen(true); }}
                placeholder="학교명, 매장명"
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
          addSchoolMode={addSchoolMode}
          onAddSchoolFromMap={handleAddSchoolFromMap}
          addTobaccoMode={addTobaccoMode}
          onAddTobaccoFromMap={handleAddTobaccoFromMap}
          isAdmin={isAdmin}
          onEditTobacco={handleEditTobaccoShop}
          onDeleteTobacco={handleDeleteTobacco}
          tobaccoVersion={tobaccoVersion}
        />

        {/* 지도에서 학교/담배샵 추가 모드 토글 버튼 — 관리자만 */}
        {isAdmin && (
          <div
            className="absolute left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2"
            style={{ bottom: isMobile ? `${MOBILE_SHEET_HANDLE_H + 56}px` : "1.5rem" }}
          >
            <button
              onClick={() => { setAddSchoolMode((v) => !v); setAddTobaccoMode(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg transition-all ${
                addSchoolMode
                  ? "bg-blue-600 text-white ring-2 ring-blue-300"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-blue-50"
              }`}
            >
              <SchoolIcon size={15} />
              {addSchoolMode
                ? (isMobile ? "📍 위치 클릭 (재탭 해제)" : "📍 학교 위치를 클릭하세요 (재클릭 해제)")
                : "학교 추가"}
            </button>
            <button
              onClick={() => { setAddTobaccoMode((v) => !v); setAddSchoolMode(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg transition-all ${
                addTobaccoMode
                  ? "bg-purple-600 text-white ring-2 ring-purple-300"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-purple-50"
              }`}
            >
              🚬
              {addTobaccoMode
                ? (isMobile ? "📍 위치 클릭 (재탭 해제)" : "📍 담배샵 위치를 클릭하세요 (재클릭 해제)")
                : "담배샵 추가"}
            </button>
          </div>
        )}

        {/* 관리자 모드 토글 버튼 + 자동 저장 상태 (좌하단) */}
        <div
          className="absolute left-4 z-[1000] flex items-center gap-2 flex-wrap"
          style={{ bottom: isMobile ? `${MOBILE_SHEET_HANDLE_H + 10}px` : "1.5rem" }}
        >
          <button
            onClick={() => isAdmin ? handleAdminLogout() : setShowAdminModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all border ${
              isAdmin
                ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
            title={isAdmin ? "관리자 모드 해제" : "관리자 로그인"}
          >
            {isAdmin ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {isAdmin ? (adminName || "관리자") : "뷰어"}
          </button>

          {/* 변경 이력 버튼 — 관리자만 */}
          {isAdmin && (
            <button
              onClick={() => setShowChangelog(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold shadow-md bg-white text-indigo-500 border border-indigo-200 hover:bg-indigo-50 transition-all"
              title="변경 이력 보기"
            >
              <History className="w-3.5 h-3.5" />
              이력
            </button>
          )}

          {/* 관리자 대시보드 버튼 — 관리자만 */}
          {isAdmin && (
            <button
              onClick={() => setShowAdminDashboard(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold shadow-md bg-white text-amber-600 border border-amber-200 hover:bg-amber-50 transition-all"
              title="관리자 대시보드"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              대시보드
            </button>
          )}

          {/* 자동 저장 상태 뱃지 */}
          {isAdmin && autoSaveStatus !== "idle" && (
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-sm border transition-all ${
              autoSaveStatus === "saving"
                ? "bg-white text-slate-500 border-slate-200 animate-pulse"
                : autoSaveStatus === "saved"
                ? "bg-green-50 text-green-600 border-green-200"
                : "bg-red-50 text-red-500 border-red-200"
            }`}>
              {autoSaveStatus === "saving" && <Cloud className="w-3 h-3" />}
              {autoSaveStatus === "saved" && <Check className="w-3 h-3" />}
              {autoSaveStatus === "error" && <X className="w-3 h-3" />}
              {autoSaveStatus === "saving" && "저장 중..."}
              {autoSaveStatus === "saved" && "자동 저장됨"}
              {autoSaveStatus === "error" && "저장 실패"}
            </span>
          )}
        </div>

        {/* Legend (top-right) */}
        <div className="absolute top-4 right-4 z-[1000] flex items-start gap-2">
          {/* 데스크톱: ZoneShopPanel을 Legend 왼쪽에 나란히 */}
          {!isMobile && activeZonePanel && (
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
            schools={schools}
            tobaccoShops={tobaccoShops}
            showRadius50={showRadius50}
            showRadius200={showRadius200}
            showTobacco={showTobacco}
            showMuIn={showMuIn}
            showYuIn={showYuIn}
            activeZonePanel={activeZonePanel}
            visibleSchoolTypes={visibleSchoolTypes}
            onToggleRadius50={() => setShowRadius50((v) => !v)}
            onToggleRadius200={() => setShowRadius200((v) => !v)}
            onToggleTobacco={() => setShowTobacco((v) => !v)}
            onToggleMuIn={() => setShowMuIn((v) => !v)}
            onToggleYuIn={() => setShowYuIn((v) => !v)}
            onOpenZonePanel={(zone) =>
              setActiveZonePanel((prev) => prev === zone ? null : zone)
            }
            onToggleSchoolType={(type) =>
              setVisibleSchoolTypes((prev) => {
                const next = new Set(prev);
                if (next.has(type)) next.delete(type); else next.add(type);
                return next;
              })
            }
            defaultCollapsed={isMobile}
          />
        </div>

        {/* 모바일: ZoneShopPanel을 하단 오버레이로 표시 */}
        {isMobile && activeZonePanel && (
          <div
            className="fixed left-0 right-0 z-[1002] rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ bottom: `${MOBILE_SHEET_HANDLE_H}px`, height: "60vh" }}
          >
            <ZoneShopPanel
              zone={activeZonePanel}
              tobaccoShops={tobaccoShops}
              schools={schools}
              onClose={() => setActiveZonePanel(null)}
              onSelectShop={(shop) => {
                setSelectedTobaccoShop(shop);
                setActiveZonePanel(null);
              }}
              fullWidth
            />
          </div>
        )}

        {/* District Info Panel */}
        {selectedSchool && (
          isMobile ? (
            /* 모바일: 하단 시트 핸들 바로 위에 풀-너비 패널 */
            <div
              className="fixed left-2 right-2 z-[1010] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
              style={{ bottom: `${MOBILE_SHEET_HANDLE_H + 8}px` }}
            >
              <DistrictPanel
                school={selectedSchool}
                allSchools={schools}
                tobaccoShops={tobaccoShops}
                onClose={() => setSelectedSchool(null)}
                isMobile={true}
                {...(isAdmin ? { onEdit: handleEditSchool, onDelete: handleDeleteSchool } : {})}
              />
            </div>
          ) : (
            /* 데스크톱: 우하단 고정 */
            <DistrictPanel
              school={selectedSchool}
              allSchools={schools}
              tobaccoShops={tobaccoShops}
              onClose={() => setSelectedSchool(null)}
              {...(isAdmin ? { onEdit: handleEditSchool, onDelete: handleDeleteSchool } : {})}
            />
          )
        )}
      </main>

      {/* 수정/삭제 모달 */}
      <EditPanel
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaveSchool={handleSaveSchool}
        onSaveTobacco={handleSaveTobacco}
        onDeleteSchool={handleDeleteSchool}
        onDeleteTobacco={handleDeleteTobacco}
      />

      {/* 변경 이력 모달 */}
      {showChangelog && (
        <ChangelogModal token={adminToken} onClose={() => setShowChangelog(false)} />
      )}

      {/* 관리자 대시보드 */}
      {showAdminDashboard && (
        <AdminDashboard
          schools={schools}
          tobaccoShops={tobaccoShops}
          token={adminToken}
          onClose={() => setShowAdminDashboard(false)}
          onDataUpdate={(newSchools, newTobacco) => {
            setSchools(newSchools);
            setTobaccoShops(newTobacco);
          }}
        />
      )}

      {showAdminModal && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAdminModal(false); setAdminPwInput(""); setAdminError(""); } }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-800">관리자 로그인</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">관리자 코드를 입력하면 편집 기능이 활성화됩니다.</p>
            <input
              type="password"
              placeholder="관리자 코드"
              value={adminPwInput}
              onChange={(e) => { setAdminPwInput(e.target.value); setAdminError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent mb-2"
            />
            {adminError && (
              <p className="text-xs text-red-500 mb-2">{adminError}</p>
            )}
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => { setShowAdminModal(false); setAdminPwInput(""); setAdminError(""); }}
                className="flex-1 py-2 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAdminLogin}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
