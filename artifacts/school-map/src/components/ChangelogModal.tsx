import { useEffect, useState } from "react";
import { X, History, Plus, Minus, RefreshCw, Trash2 } from "lucide-react";

interface ChangelogEntry {
  at: string;
  adminName: string;
  schoolsAdded: string[];
  schoolsRemoved: string[];
  tobaccoAdded: string[];
  tobaccoRemoved: string[];
}

interface Props {
  token: string;
  onClose: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return iso; }
}

function Tag({ label, color }: { label: string; color: "green" | "red" }) {
  return (
    <span className={`inline-block text-[9px] rounded px-1 py-0.5 mr-0.5 mb-0.5 ${
      color === "green" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
    }`}>
      {label}
    </span>
  );
}

export default function ChangelogModal({ token, onClose }: Props) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    fetch("/api/admin/changelog", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json() as Promise<{ ok: boolean; entries?: ChangelogEntry[]; error?: string }>)
      .then(data => {
        if (data.ok && data.entries) setEntries(data.entries);
        else setError(data.error ?? "불러오기 실패");
      })
      .catch(() => setError("서버 연결에 실패했습니다."))
      .finally(() => setLoading(false));
  };

  const handleClear = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    setClearing(true);
    setConfirmClear(false);
    fetch("/api/admin/changelog", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json() as Promise<{ ok: boolean; error?: string }>)
      .then(data => {
        if (data.ok) setEntries([]);
        else setError(data.error ?? "초기화 실패");
      })
      .catch(() => setError("서버 연결에 실패했습니다."))
      .finally(() => setClearing(false));
  };

  useEffect(() => { load(); }, []);

  const isEmpty = !loading && !error && entries.length === 0;

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[min(92vw,520px)] max-h-[80vh] flex flex-col mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-800">변경 이력</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={load}
              title="새로고침"
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            {/* 초기화 버튼 — 1회 클릭 시 확인 요청, 2회 클릭 시 실행 */}
            {entries.length > 0 && (
              <button
                onClick={handleClear}
                disabled={clearing}
                title={confirmClear ? "한 번 더 클릭하면 전체 삭제됩니다" : "이력 전체 초기화"}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                  confirmClear
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "hover:bg-red-50 text-red-400 hover:text-red-600"
                }`}
                onBlur={() => setConfirmClear(false)}
              >
                <Trash2 className="w-3 h-3" />
                {confirmClear ? "확인 (재클릭)" : "초기화"}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {loading && (
            <p className="text-center text-xs text-slate-400 py-8">불러오는 중...</p>
          )}
          {error && (
            <p className="text-center text-xs text-red-400 py-8">{error}</p>
          )}
          {isEmpty && (
            <p className="text-center text-xs text-slate-400 py-8">변경 이력이 없습니다.</p>
          )}
          {entries.map((entry, i) => {
            const hasChanges =
              entry.schoolsAdded.length > 0 ||
              entry.schoolsRemoved.length > 0 ||
              entry.tobaccoAdded.length > 0 ||
              entry.tobaccoRemoved.length > 0;
            return (
              <div key={i} className="border border-slate-100 rounded-xl p-3 bg-slate-50/60">
                {/* 메타 */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-slate-700 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
                    {entry.adminName}
                  </span>
                  <span className="text-[9px] text-slate-400">{formatDate(entry.at)}</span>
                </div>

                {!hasChanges && (
                  <p className="text-[9px] text-slate-400 italic">변경 내용 없음 (재저장)</p>
                )}

                {/* 학교 추가 */}
                {entry.schoolsAdded.length > 0 && (
                  <div className="mb-1">
                    <div className="flex items-center gap-0.5 mb-0.5">
                      <Plus className="w-2.5 h-2.5 text-emerald-500" />
                      <span className="text-[9px] text-emerald-600 font-semibold">학교 추가 {entry.schoolsAdded.length}건</span>
                    </div>
                    <div className="pl-3">
                      {entry.schoolsAdded.slice(0, 8).map((n, j) => <Tag key={j} label={n} color="green" />)}
                      {entry.schoolsAdded.length > 8 && (
                        <span className="text-[9px] text-slate-400">외 {entry.schoolsAdded.length - 8}건</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 학교 삭제 */}
                {entry.schoolsRemoved.length > 0 && (
                  <div className="mb-1">
                    <div className="flex items-center gap-0.5 mb-0.5">
                      <Minus className="w-2.5 h-2.5 text-red-400" />
                      <span className="text-[9px] text-red-500 font-semibold">학교 삭제 {entry.schoolsRemoved.length}건</span>
                    </div>
                    <div className="pl-3">
                      {entry.schoolsRemoved.slice(0, 8).map((n, j) => <Tag key={j} label={n} color="red" />)}
                      {entry.schoolsRemoved.length > 8 && (
                        <span className="text-[9px] text-slate-400">외 {entry.schoolsRemoved.length - 8}건</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 담배샵 추가 */}
                {entry.tobaccoAdded.length > 0 && (
                  <div className="mb-1">
                    <div className="flex items-center gap-0.5 mb-0.5">
                      <Plus className="w-2.5 h-2.5 text-emerald-500" />
                      <span className="text-[9px] text-emerald-600 font-semibold">담배샵 추가 {entry.tobaccoAdded.length}건</span>
                    </div>
                    <div className="pl-3">
                      {entry.tobaccoAdded.slice(0, 8).map((n, j) => <Tag key={j} label={n} color="green" />)}
                      {entry.tobaccoAdded.length > 8 && (
                        <span className="text-[9px] text-slate-400">외 {entry.tobaccoAdded.length - 8}건</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 담배샵 삭제 */}
                {entry.tobaccoRemoved.length > 0 && (
                  <div>
                    <div className="flex items-center gap-0.5 mb-0.5">
                      <Minus className="w-2.5 h-2.5 text-red-400" />
                      <span className="text-[9px] text-red-500 font-semibold">담배샵 삭제 {entry.tobaccoRemoved.length}건</span>
                    </div>
                    <div className="pl-3">
                      {entry.tobaccoRemoved.slice(0, 8).map((n, j) => <Tag key={j} label={n} color="red" />)}
                      {entry.tobaccoRemoved.length > 8 && (
                        <span className="text-[9px] text-slate-400">외 {entry.tobaccoRemoved.length - 8}건</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 푸터 */}
        {entries.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-2 text-center">
            <span className="text-[9px] text-slate-400">최근 {entries.length}건 표시 (최대 300건 보관)</span>
          </div>
        )}
      </div>
    </div>
  );
}
