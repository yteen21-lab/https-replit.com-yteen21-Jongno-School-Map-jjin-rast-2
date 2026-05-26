import { useState, useEffect } from "react";
import { X, Trash2, Save, AlertTriangle } from "lucide-react";
import { School, TobaccoShop, SchoolType, SCHOOL_TYPE_COLORS } from "@/types/school";

type EditTarget =
  | { kind: "school"; item: School }
  | { kind: "tobacco"; item: TobaccoShop };

interface EditPanelProps {
  target: EditTarget | null;
  onClose: () => void;
  onSaveSchool: (updated: School) => void;
  onSaveTobacco: (updated: TobaccoShop) => void;
  onDeleteSchool: (id: string) => void;
  onDeleteTobacco: (id: string) => void;
}

const SCHOOL_TYPES: SchoolType[] = ["초등학교", "중학교", "고등학교", "기타"];

export default function EditPanel({
  target,
  onClose,
  onSaveSchool,
  onSaveTobacco,
  onDeleteSchool,
  onDeleteTobacco,
}: EditPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* 학교 편집 상태 */
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState<SchoolType>("초등학교");
  const [schoolDistrict, setSchoolDistrict] = useState("");
  const [propertyRadius, setPropertyRadius] = useState<string>("");

  /* 담배샵 편집 상태 */
  const [shopName, setShopName] = useState("");
  const [shopType, setShopType] = useState<"무인" | "유인">("무인");
  const [shopAddress, setShopAddress] = useState("");

  /* 대상이 바뀌면 폼 초기화 */
  useEffect(() => {
    setConfirmDelete(false);
    if (!target) return;
    if (target.kind === "school") {
      setSchoolName(target.item.name);
      setSchoolType(target.item.type);
      setSchoolDistrict(target.item.district ?? "");
      setPropertyRadius(target.item.propertyRadius != null ? String(target.item.propertyRadius) : "");
    } else {
      setShopName(target.item.name);
      setShopType(target.item.shopType ?? "무인");
      setShopAddress(target.item.address ?? "");
    }
  }, [target]);

  if (!target) return null;

  const isSchool = target.kind === "school";
  const title = isSchool ? "학교 수정" : "업소 수정";
  const accentClass = isSchool ? "bg-blue-600" : "bg-orange-500";

  function handleSave() {
    if (!target) return;
    if (isSchool) {
      if (!schoolName.trim()) return;
      const pr = parseFloat(propertyRadius);
      onSaveSchool({
        ...(target.item as School),
        name: schoolName.trim(),
        type: schoolType,
        district: schoolDistrict.trim() || undefined,
        propertyRadius: !isNaN(pr) && pr > 0 ? pr : undefined,
      });
    } else {
      if (!shopName.trim()) return;
      onSaveTobacco({
        ...(target.item as TobaccoShop),
        name: shopName.trim(),
        shopType,
        address: shopAddress.trim() || undefined,
      });
    }
    onClose();
  }

  function handleDelete() {
    if (!target) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    if (isSchool) onDeleteSchool(target.item.id);
    else onDeleteTobacco(target.item.id);
    onClose();
  }

  return (
    /* 반투명 오버레이 */
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* 헤더 */}
        <div className={`${accentClass} px-4 py-3 flex items-center justify-between`}>
          <span className="text-white font-bold text-sm">{title}</span>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/20 rounded-full p-0.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {isSchool ? (
            /* ── 학교 폼 ── */
            <>
              <Field label="학교명">
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-800"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="학교명"
                />
              </Field>

              <Field label="구분">
                <div className="flex gap-2 flex-wrap">
                  {SCHOOL_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSchoolType(t)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                        schoolType === t
                          ? "text-white border-transparent"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                      style={schoolType === t ? { background: SCHOOL_TYPE_COLORS[t] } : {}}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="구 (선택)">
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-800"
                  value={schoolDistrict}
                  onChange={(e) => setSchoolDistrict(e.target.value)}
                  placeholder="예: 종로구"
                />
              </Field>

              <Field label="부지 반경 (m, 선택)">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={5}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-800"
                    value={propertyRadius}
                    onChange={(e) => setPropertyRadius(e.target.value)}
                    placeholder="예: 80"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">m</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  학교 중심→부지 끝 거리. 보호구역은 부지 끝에서 50m/200m 적용됩니다.
                </p>
              </Field>
            </>
          ) : (
            /* ── 담배샵 폼 ── */
            <>
              <Field label="업소명">
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-800"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="업소명"
                />
              </Field>

              <Field label="유형">
                <div className="flex gap-2">
                  {(["무인", "유인"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setShopType(t)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        shopType === t
                          ? t === "무인"
                            ? "bg-slate-700 text-white border-slate-700"
                            : "bg-purple-600 text-white border-purple-600"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {t === "무인" ? "🚬 무인자판기" : "🏬 유인매장"}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="주소 (선택)">
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-800"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="주소"
                />
              </Field>
            </>
          )}

          {/* 삭제 확인 메시지 */}
          {confirmDelete && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleDelete}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                confirmDelete
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmDelete ? "확인 삭제" : "삭제"}
            </button>

            {confirmDelete && (
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
              >
                취소
              </button>
            )}

            <button
              onClick={handleSave}
              className={`ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all ${
                isSchool ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      {children}
    </div>
  );
}
