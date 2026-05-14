import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  X, BarChart2, Database, Layers, Users, Link2,
  Check, Download, RefreshCw, Save, Trash2, Plus,
  Clock, AlertCircle, Copy, RotateCcw, ShieldCheck,
  School as SchoolIcon, Store,
} from "lucide-react";
import type { School, TobaccoShop, TobaccoZone, SchoolType } from "../types/school";
import { SCHOOL_TYPE_COLORS } from "../types/school";

interface AdminDashboardProps {
  schools: School[];
  tobaccoShops: TobaccoShop[];
  token: string;
  onClose: () => void;
  onDataUpdate: (schools: School[], tobacco: TobaccoShop[]) => void;
}

type Tab = "stats" | "data" | "bulk" | "accounts" | "share";

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "stats",    label: "통계",      Icon: BarChart2   },
  { id: "data",     label: "데이터관리", Icon: Database    },
  { id: "bulk",     label: "일괄작업",  Icon: Layers      },
  { id: "accounts", label: "계정관리",  Icon: Users       },
  { id: "share",    label: "공유링크",  Icon: Link2       },
];

/* ── 거리 계산 ──────────────────────────────────────── */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTobaccoZone(t: TobaccoShop, schools: School[]): TobaccoZone {
  let minDist = Infinity;
  for (const s of schools) {
    const d = haversine(t.lat, t.lng, s.lat, s.lng) - (s.propertyRadius ?? 0);
    if (d < minDist) minDist = d;
  }
  if (minDist <= 50) return "50m이내";
  if (minDist <= 200) return "200m이내";
  return "외부";
}

/* ── CSV 내보내기 ──────────────────────────────────── */
function exportCSV(filename: string, headers: string[], rows: (string | number | undefined)[][]): void {
  const esc = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(r => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── 구 추출 ──────────────────────────────────────── */
function extractGu(text?: string): string {
  if (!text) return "기타";
  const m = text.match(/(\S+구)/);
  return m ? m[1] : "기타";
}

/* ── 날짜 포맷 ──────────────────────────────────────── */
function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/* ═══════════════════════════════════════════════════ */
export default function AdminDashboard({ schools, tobaccoShops, token, onClose, onDataUpdate }: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>("stats");

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  /* ── 1. 통계 탭 데이터 ────────────────────────────── */
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");

  const schoolTypeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of schools) map[s.type] = (map[s.type] ?? 0) + 1;
    return map;
  }, [schools]);

  const tobaccoZones = useMemo(() => tobaccoShops.map(t => getTobaccoZone(t, schools)), [tobaccoShops, schools]);

  const zoneCounts = useMemo(() => {
    const counts = { "50m이내": 0, "200m이내": 0, "외부": 0 };
    for (const z of tobaccoZones) counts[z]++;
    return counts;
  }, [tobaccoZones]);

  const typeCounts = useMemo(() => {
    const counts = { 무인: 0, 유인: 0, 미분류: 0 };
    for (const t of tobaccoShops) {
      if (t.shopType === "무인") counts.무인++;
      else if (t.shopType === "유인") counts.유인++;
      else counts.미분류++;
    }
    return counts;
  }, [tobaccoShops]);

  const districtStats = useMemo(() => {
    const map: Record<string, { schools: number; tobacco: number; violations: number }> = {};
    for (const s of schools) {
      const gu = extractGu(s.district);
      if (!map[gu]) map[gu] = { schools: 0, tobacco: 0, violations: 0 };
      map[gu].schools++;
    }
    for (let i = 0; i < tobaccoShops.length; i++) {
      const t = tobaccoShops[i];
      const zone = tobaccoZones[i];
      const gu = extractGu(t.address);
      if (!map[gu]) map[gu] = { schools: 0, tobacco: 0, violations: 0 };
      map[gu].tobacco++;
      if (zone === "50m이내" || zone === "200m이내") map[gu].violations++;
    }
    return Object.entries(map).sort((a, b) => b[1].violations - a[1].violations);
  }, [schools, tobaccoShops, tobaccoZones]);

  const nearbyTobacco = useMemo(() => {
    if (!selectedSchoolId) return [];
    const school = schools.find(s => s.id === selectedSchoolId);
    if (!school) return [];
    return tobaccoShops
      .map(t => ({
        ...t,
        dist: haversine(t.lat, t.lng, school.lat, school.lng) - (school.propertyRadius ?? 0),
        zone: getTobaccoZone(t, [school]),
      }))
      .filter(t => t.dist <= 200)
      .sort((a, b) => a.dist - b.dist);
  }, [selectedSchoolId, schools, tobaccoShops]);

  /* ── 2. 데이터관리 탭 ────────────────────────────── */
  const [snapshots, setSnapshots] = useState<{
    id: number; label: string; createdAt: string; adminName: string | null;
    schoolCount: number; tobaccoCount: number;
  }[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [snapshotError, setSnapshotError] = useState("");
  const [dedupStatus, setDedupStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [dedupResult, setDedupResult] = useState("");
  const [confirmDeleteSnap, setConfirmDeleteSnap] = useState<number | null>(null);

  const loadSnapshots = useCallback(async () => {
    setSnapshotLoading(true);
    try {
      const r = await fetch("/api/admin/snapshots", { headers: authHeaders() });
      const j = await r.json() as { ok: boolean; snapshots: typeof snapshots };
      if (j.ok) setSnapshots(j.snapshots);
    } finally {
      setSnapshotLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { if (tab === "data") loadSnapshots(); }, [tab, loadSnapshots]);

  const handleSaveSnapshot = useCallback(async () => {
    if (!snapshotLabel.trim()) { setSnapshotError("이름을 입력해 주세요."); return; }
    setSnapshotError("");
    try {
      const r = await fetch("/api/admin/snapshots", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ label: snapshotLabel.trim(), data: { schools, tobacco: tobaccoShops } }),
      });
      const j = await r.json() as { ok: boolean; error?: string };
      if (j.ok) { setSnapshotLabel(""); loadSnapshots(); }
      else setSnapshotError(j.error ?? "저장 실패");
    } catch { setSnapshotError("네트워크 오류"); }
  }, [snapshotLabel, schools, tobaccoShops, authHeaders, loadSnapshots]);

  const handleRestoreSnapshot = useCallback(async (id: number) => {
    try {
      const r = await fetch(`/api/admin/snapshots/${id}/restore`, { method: "POST", headers: authHeaders() });
      const j = await r.json() as { ok: boolean; data?: { schools: School[]; tobacco: TobaccoShop[] }; error?: string };
      if (j.ok && j.data) {
        onDataUpdate(j.data.schools, j.data.tobacco);
        onClose();
      }
    } catch { /* ignore */ }
  }, [authHeaders, onDataUpdate, onClose]);

  const handleDeleteSnapshot = useCallback(async (id: number) => {
    if (confirmDeleteSnap !== id) { setConfirmDeleteSnap(id); return; }
    setConfirmDeleteSnap(null);
    await fetch(`/api/admin/snapshots/${id}`, { method: "DELETE", headers: authHeaders() });
    loadSnapshots();
  }, [confirmDeleteSnap, authHeaders, loadSnapshots]);

  const handleDedup = useCallback(async () => {
    setDedupStatus("running");
    try {
      const r = await fetch("/api/school-map-data/dedup", { method: "POST", headers: authHeaders() });
      const j = await r.json() as { ok: boolean; removedSchools?: number; removedTobacco?: number; error?: string };
      if (j.ok) {
        setDedupResult(`학교 ${j.removedSchools ?? 0}개, 담배샵 ${j.removedTobacco ?? 0}개 중복 제거`);
        setDedupStatus("done");
        /* 서버에서 최신 데이터 가져오기 */
        const dr = await fetch("/api/school-map-data");
        const dj = await dr.json() as { schools: School[]; tobacco: TobaccoShop[] };
        if (dj.schools) onDataUpdate(dj.schools, dj.tobacco);
      } else {
        setDedupResult(j.error ?? "오류 발생");
        setDedupStatus("error");
      }
    } catch {
      setDedupResult("네트워크 오류");
      setDedupStatus("error");
    }
  }, [authHeaders, onDataUpdate]);

  /* ── 3. 일괄작업 탭 ──────────────────────────────── */
  const [bulkZone, setBulkZone] = useState<TobaccoZone | "전체">("전체");
  const [bulkType, setBulkType] = useState<"전체" | "무인" | "유인" | "미분류">("전체");
  const [bulkKeyword, setBulkKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionStatus, setBulkActionStatus] = useState("");

  const filteredTobacco = useMemo(() => {
    return tobaccoShops
      .map((t, i) => ({ ...t, zone: tobaccoZones[i] }))
      .filter(t => {
        if (bulkZone !== "전체" && t.zone !== bulkZone) return false;
        if (bulkType !== "전체") {
          const st = t.shopType ?? "미분류";
          if (bulkType === "미분류" ? st === "무인" || st === "유인" : st !== bulkType) return false;
        }
        if (bulkKeyword && !t.name.includes(bulkKeyword) && !(t.address ?? "").includes(bulkKeyword)) return false;
        return true;
      });
  }, [tobaccoShops, tobaccoZones, bulkZone, bulkType, bulkKeyword]);

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () =>
    setSelectedIds(prev => prev.size === filteredTobacco.length ? new Set() : new Set(filteredTobacco.map(t => t.id)));

  const handleBulkTypeChange = useCallback((newType: "무인" | "유인") => {
    if (selectedIds.size === 0) { setBulkActionStatus("항목을 선택하세요."); return; }
    const updated = tobaccoShops.map(t => selectedIds.has(t.id) ? { ...t, shopType: newType } : t);
    onDataUpdate(schools, updated);
    setBulkActionStatus(`${selectedIds.size}개 → ${newType} 변경 완료`);
    setSelectedIds(new Set());
  }, [selectedIds, tobaccoShops, schools, onDataUpdate]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) { setBulkActionStatus("항목을 선택하세요."); return; }
    const updated = tobaccoShops.filter(t => !selectedIds.has(t.id));
    onDataUpdate(schools, updated);
    setBulkActionStatus(`${selectedIds.size}개 삭제 완료`);
    setSelectedIds(new Set());
  }, [selectedIds, tobaccoShops, schools, onDataUpdate]);

  /* ── 4. 계정관리 탭 ──────────────────────────────── */
  const [accounts, setAccounts] = useState<{
    id: number | null; name: string; createdAt: Date | null; fromEnv: boolean;
  }[]>([]);
  const [acctLoading, setAcctLoading] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [acctError, setAcctError] = useState("");
  const [acctSuccess, setAcctSuccess] = useState("");
  const [confirmDeleteAcct, setConfirmDeleteAcct] = useState<number | null>(null);

  const loadAccounts = useCallback(async () => {
    setAcctLoading(true);
    try {
      const r = await fetch("/api/admin/accounts", { headers: authHeaders() });
      const j = await r.json() as { ok: boolean; accounts: typeof accounts };
      if (j.ok) setAccounts(j.accounts);
    } finally {
      setAcctLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { if (tab === "accounts") loadAccounts(); }, [tab, loadAccounts]);

  const handleAddAccount = useCallback(async () => {
    setAcctError(""); setAcctSuccess("");
    if (!newCode.trim() || !newName.trim()) { setAcctError("코드와 이름을 모두 입력하세요."); return; }
    try {
      const r = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ code: newCode.trim(), name: newName.trim() }),
      });
      const j = await r.json() as { ok: boolean; error?: string };
      if (j.ok) {
        setNewCode(""); setNewName("");
        setAcctSuccess(`"${newName.trim()}" 계정이 추가됐습니다.`);
        loadAccounts();
      } else setAcctError(j.error ?? "추가 실패");
    } catch { setAcctError("네트워크 오류"); }
  }, [newCode, newName, authHeaders, loadAccounts]);

  const handleDeleteAccount = useCallback(async (id: number) => {
    if (confirmDeleteAcct !== id) { setConfirmDeleteAcct(id); return; }
    setConfirmDeleteAcct(null);
    await fetch(`/api/admin/accounts/${id}`, { method: "DELETE", headers: authHeaders() });
    loadAccounts();
  }, [confirmDeleteAcct, authHeaders, loadAccounts]);

  /* ── 5. 공유링크 탭 ──────────────────────────────── */
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ═══════════════════ 렌더 ═══════════════════════ */
  return (
    <div
      className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[min(96vw,640px)] max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800">관리자 대시보드</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 탭 바 */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                tab === id
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="overflow-y-auto flex-1 p-4">

          {/* ── 1. 통계 ───────────────────────────── */}
          {tab === "stats" && (
            <div className="space-y-4">
              {/* 요약 카드 */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<SchoolIcon className="w-4 h-4 text-blue-500" />} label="전체 학교" value={schools.length} color="blue" />
                <StatCard icon={<Store className="w-4 h-4 text-slate-500" />} label="전체 담배샵" value={tobaccoShops.length} color="slate" />
                <StatCard icon={<AlertCircle className="w-4 h-4 text-red-500" />} label="50m 이내 위반" value={zoneCounts["50m이내"]} color="red" />
                <StatCard icon={<AlertCircle className="w-4 h-4 text-orange-400" />} label="200m 이내 경계" value={zoneCounts["200m이내"]} color="orange" />
              </div>

              {/* 학교 유형 */}
              <Section title="학교 유형별">
                <div className="flex flex-wrap gap-2">
                  {(["유치원","초등학교","중학교","고등학교","기타"] as SchoolType[]).map(t => (
                    <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: SCHOOL_TYPE_COLORS[t] }}>
                      {t} {schoolTypeCounts[t] ?? 0}
                    </span>
                  ))}
                </div>
              </Section>

              {/* 담배샵 유형 & 구역 */}
              <Section title="담배샵 현황">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <MiniRow label="무인 자판기" value={typeCounts.무인} />
                  <MiniRow label="유인 매장" value={typeCounts.유인} />
                  <MiniRow label="미분류" value={typeCounts.미분류} />
                  <MiniRow label="50m 위반" value={zoneCounts["50m이내"]} highlight="red" />
                  <MiniRow label="200m 경계" value={zoneCounts["200m이내"]} highlight="orange" />
                  <MiniRow label="외부 (정상)" value={zoneCounts["외부"]} highlight="green" />
                </div>
              </Section>

              {/* 구별 집계 */}
              {districtStats.length > 0 && (
                <Section title="구(區)별 집계">
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {districtStats.map(([gu, d]) => (
                      <div key={gu} className="flex items-center gap-2 text-xs">
                        <span className="w-16 font-medium text-slate-700 truncate">{gu}</span>
                        <span className="text-slate-400">학교 {d.schools}</span>
                        <span className="text-slate-400">담배샵 {d.tobacco}</span>
                        {d.violations > 0 && (
                          <span className="ml-auto px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-semibold">
                            위반 {d.violations}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* 학교별 주변 담배샵 */}
              <Section title="학교별 주변 담배샵 (200m 이내)">
                <select
                  value={selectedSchoolId}
                  onChange={e => setSelectedSchoolId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 mb-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <option value="">학교를 선택하세요</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                  ))}
                </select>
                {selectedSchoolId && (
                  nearbyTobacco.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">200m 이내 담배샵이 없습니다.</p>
                  ) : (
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {nearbyTobacco.map(t => (
                        <div key={t.id} className="flex items-center gap-2 text-xs">
                          <span className={`w-14 text-center rounded px-1.5 py-0.5 font-semibold text-white text-[10px] ${
                            t.zone === "50m이내" ? "bg-red-500" : "bg-orange-400"
                          }`}>{t.zone}</span>
                          <span className="flex-1 truncate text-slate-700">{t.name}</span>
                          <span className="text-slate-400 text-[10px]">{Math.round(t.dist)}m</span>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </Section>
            </div>
          )}

          {/* ── 2. 데이터관리 ─────────────────────── */}
          {tab === "data" && (
            <div className="space-y-4">
              {/* CSV 내보내기 */}
              <Section title="CSV 내보내기">
                <div className="flex gap-2">
                  <button
                    onClick={() => exportCSV(`schools_${today()}.csv`,
                      ["id","이름","유형","위도","경도","구역","부지반경(m)"],
                      schools.map(s => [s.id, s.name, s.type, s.lat, s.lng, s.district ?? "", s.propertyRadius ?? ""])
                    )}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    학교 CSV ({schools.length}개)
                  </button>
                  <button
                    onClick={() => exportCSV(`tobacco_${today()}.csv`,
                      ["id","이름","위도","경도","주소","유형"],
                      tobaccoShops.map(t => [t.id, t.name, t.lat, t.lng, t.address ?? "", t.shopType ?? ""])
                    )}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    담배샵 CSV ({tobaccoShops.length}개)
                  </button>
                </div>
              </Section>

              {/* 중복 정리 */}
              <Section title="중복 데이터 정리">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDedup}
                    disabled={dedupStatus === "running"}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${dedupStatus === "running" ? "animate-spin" : ""}`} />
                    {dedupStatus === "running" ? "처리 중..." : "중복 제거 실행"}
                  </button>
                  {dedupResult && (
                    <span className={`text-xs font-medium ${dedupStatus === "done" ? "text-green-600" : "text-red-500"}`}>
                      {dedupResult}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">이름·좌표가 동일한 항목을 자동으로 하나로 합칩니다.</p>
              </Section>

              {/* 스냅샷 */}
              <Section title="스냅샷 저장 / 복원">
                <div className="flex gap-2 mb-3">
                  <input
                    value={snapshotLabel}
                    onChange={e => setSnapshotLabel(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSaveSnapshot()}
                    placeholder="스냅샷 이름 (예: 2025년 5월 기준)"
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <button
                    onClick={handleSaveSnapshot}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    저장
                  </button>
                </div>
                {snapshotError && <p className="text-xs text-red-500 mb-2">{snapshotError}</p>}

                {snapshotLoading ? (
                  <p className="text-xs text-slate-400 text-center py-4">불러오는 중...</p>
                ) : snapshots.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">저장된 스냅샷이 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {snapshots.map(s => (
                      <div key={s.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{s.label}</p>
                          <p className="text-[10px] text-slate-400">
                            {fmtDate(s.createdAt)} · {s.adminName ?? "관리자"} · 학교 {s.schoolCount} 담배샵 {s.tobaccoCount}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestoreSnapshot(s.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-semibold transition-colors"
                          title="이 스냅샷으로 복원"
                        >
                          <RotateCcw className="w-3 h-3" />
                          복원
                        </button>
                        <button
                          onClick={() => handleDeleteSnapshot(s.id)}
                          onBlur={() => setConfirmDeleteSnap(null)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                            confirmDeleteSnap === s.id
                              ? "bg-red-500 text-white"
                              : "bg-red-50 text-red-400 hover:bg-red-100"
                          }`}
                          title={confirmDeleteSnap === s.id ? "한 번 더 클릭하면 삭제" : "삭제"}
                        >
                          <Trash2 className="w-3 h-3" />
                          {confirmDeleteSnap === s.id ? "확인" : "삭제"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* ── 3. 일괄작업 ───────────────────────── */}
          {tab === "bulk" && (
            <div className="space-y-3">
              {/* 필터 */}
              <Section title="필터">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">보호구역</label>
                    <select value={bulkZone} onChange={e => { setBulkZone(e.target.value as TobaccoZone | "전체"); setSelectedIds(new Set()); }}
                      className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300">
                      <option value="전체">전체</option>
                      <option value="50m이내">50m 이내</option>
                      <option value="200m이내">200m 이내</option>
                      <option value="외부">외부</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">유형</label>
                    <select value={bulkType} onChange={e => { setBulkType(e.target.value as typeof bulkType); setSelectedIds(new Set()); }}
                      className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300">
                      <option value="전체">전체</option>
                      <option value="무인">무인</option>
                      <option value="유인">유인</option>
                      <option value="미분류">미분류</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">키워드</label>
                    <input value={bulkKeyword} onChange={e => { setBulkKeyword(e.target.value); setSelectedIds(new Set()); }}
                      placeholder="이름/주소"
                      className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                </div>
              </Section>

              {/* 일괄 액션 */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500">
                  {filteredTobacco.length}개 중 <strong>{selectedIds.size}</strong>개 선택
                </span>
                <button onClick={toggleAll} className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors">
                  {selectedIds.size === filteredTobacco.length && filteredTobacco.length > 0 ? "전체 해제" : "전체 선택"}
                </button>
                <button
                  onClick={() => handleBulkTypeChange("무인")}
                  disabled={selectedIds.size === 0}
                  className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-600 hover:bg-purple-100 font-semibold disabled:opacity-40 transition-colors"
                >→ 무인으로 변경</button>
                <button
                  onClick={() => handleBulkTypeChange("유인")}
                  disabled={selectedIds.size === 0}
                  className="text-xs px-2 py-1 rounded bg-teal-50 text-teal-600 hover:bg-teal-100 font-semibold disabled:opacity-40 transition-colors"
                >→ 유인으로 변경</button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0}
                  className="text-xs px-2 py-1 rounded bg-red-50 text-red-500 hover:bg-red-100 font-semibold disabled:opacity-40 transition-colors"
                >선택 삭제</button>
                {bulkActionStatus && <span className="text-xs text-green-600 font-medium">{bulkActionStatus}</span>}
              </div>

              {/* 목록 */}
              <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2">
                {filteredTobacco.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">조건에 맞는 담배샵이 없습니다.</p>
                ) : (
                  filteredTobacco.map(t => (
                    <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)}
                        className="rounded accent-amber-500" />
                      <span className={`w-14 text-center text-[10px] font-semibold rounded px-1 py-0.5 text-white ${
                        t.zone === "50m이내" ? "bg-red-500" : t.zone === "200m이내" ? "bg-orange-400" : "bg-slate-400"
                      }`}>{t.zone}</span>
                      <span className="flex-1 text-xs text-slate-700 truncate">{t.name}</span>
                      <span className="text-[10px] text-slate-400">{t.shopType ?? "미분류"}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── 4. 계정관리 ───────────────────────── */}
          {tab === "accounts" && (
            <div className="space-y-4">
              {/* 새 계정 추가 */}
              <Section title="새 계정 추가">
                <div className="flex gap-2">
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="이름 (예: 홍길동)"
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <input
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddAccount()}
                    placeholder="코드 (4자 이상)"
                    type="password"
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <button
                    onClick={handleAddAccount}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    추가
                  </button>
                </div>
                {acctError && <p className="text-xs text-red-500 mt-1">{acctError}</p>}
                {acctSuccess && <p className="text-xs text-green-600 mt-1">{acctSuccess}</p>}
                <p className="text-[10px] text-slate-400 mt-1">코드는 로그인 시 입력하는 비밀번호입니다. 저장 후 확인 불가.</p>
              </Section>

              {/* 계정 목록 */}
              <Section title="계정 목록">
                {acctLoading ? (
                  <p className="text-xs text-slate-400 text-center py-4">불러오는 중...</p>
                ) : accounts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">등록된 계정이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {accounts.map((a, i) => (
                      <div key={a.id ?? `env-${i}`} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800">{a.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {a.fromEnv ? "환경변수 계정 (삭제 불가)" : `DB 계정 · 등록 ${fmtDate(a.createdAt)}`}
                          </p>
                        </div>
                        {!a.fromEnv && a.id !== null && (
                          <button
                            onClick={() => handleDeleteAccount(a.id!)}
                            onBlur={() => setConfirmDeleteAcct(null)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                              confirmDeleteAcct === a.id
                                ? "bg-red-500 text-white"
                                : "bg-red-50 text-red-400 hover:bg-red-100"
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                            {confirmDeleteAcct === a.id ? "확인" : "삭제"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* ── 5. 공유링크 ───────────────────────── */}
          {tab === "share" && (
            <div className="space-y-4">
              <Section title="현재 페이지 공유">
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 focus:outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      copied ? "bg-green-500 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "복사됨!" : "복사"}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">이 링크를 공유하면 현재 지도 상태를 그대로 볼 수 있습니다.</p>
              </Section>

              <Section title="서버 동기화 정보">
                <div className="grid grid-cols-2 gap-3">
                  <MiniRow label="저장된 학교" value={schools.length} />
                  <MiniRow label="저장된 담배샵" value={tobaccoShops.length} />
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  데이터는 서버에 자동 저장되어 링크를 통해 누구나 최신 데이터를 확인할 수 있습니다.
                </p>
              </Section>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── 서브 컴포넌트 ──────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">{title}</h3>
      <div className="bg-slate-50 rounded-xl p-3">{children}</div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100", slate: "bg-slate-50 border-slate-100",
    red: "bg-red-50 border-red-100", orange: "bg-orange-50 border-orange-100",
  };
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${colorMap[color] ?? "bg-slate-50 border-slate-100"}`}>
      {icon}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-800 leading-none mt-0.5">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function MiniRow({ label, value, highlight }: { label: string; value: number; highlight?: string }) {
  const cls = highlight === "red" ? "text-red-600 font-bold"
    : highlight === "orange" ? "text-orange-500 font-bold"
    : highlight === "green" ? "text-green-600 font-bold"
    : "text-slate-700";
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className={cls}>{value.toLocaleString()}</span>
    </div>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
