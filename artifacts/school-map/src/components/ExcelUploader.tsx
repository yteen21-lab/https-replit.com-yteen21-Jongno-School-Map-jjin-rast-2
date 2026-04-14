import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { School, SchoolType, TobaccoShop } from "@/types/school";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";

interface ExcelUploaderProps {
  onSchoolsLoaded: (schools: School[]) => void;
  onTobaccoShopsLoaded?: (shops: TobaccoShop[]) => void;
}

type UploadMode = "school" | "tobacco";

const SCHOOL_TYPE_MAP: Record<string, SchoolType> = {
  초: "초등학교",
  초등: "초등학교",
  초등학교: "초등학교",
  중: "중학교",
  중학: "중학교",
  중학교: "중학교",
  고: "고등학교",
  고등: "고등학교",
  고등학교: "고등학교",
  elementary: "초등학교",
  middle: "중학교",
  high: "고등학교",
};

function detectSchoolType(name: string, typeStr?: string): SchoolType {
  if (typeStr) {
    const normalized = typeStr.trim().toLowerCase();
    for (const [key, val] of Object.entries(SCHOOL_TYPE_MAP)) {
      if (normalized.includes(key)) return val;
    }
  }
  if (name.includes("초등") || name.includes("초교")) return "초등학교";
  if (name.includes("중학") || name.endsWith("중")) return "중학교";
  if (name.includes("고등") || name.endsWith("고") || name.includes("고교")) return "고등학교";
  return "기타";
}

export default function ExcelUploader({ onSchoolsLoaded, onTobaccoShopsLoaded }: ExcelUploaderProps) {
  const schoolInputRef = useRef<HTMLInputElement>(null);
  const tobaccoInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<UploadMode>("school");
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [tobaccoError, setTobaccoError] = useState<string | null>(null);
  const [isDraggingSchool, setIsDraggingSchool] = useState(false);
  const [isDraggingTobacco, setIsDraggingTobacco] = useState(false);
  const [schoolSuccess, setSchoolSuccess] = useState<number | null>(null);
  const [tobaccoSuccess, setTobaccoSuccess] = useState<number | null>(null);

  const processSchoolFile = useCallback(
    (file: File) => {
      setSchoolError(null);
      setSchoolSuccess(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

          if (rows.length === 0) { setSchoolError("파일이 비어 있습니다."); return; }

          const firstRow = rows[0];
          const findKey = (...candidates: string[]) =>
            Object.keys(firstRow).find((k) =>
              candidates.some((c) => k.trim().toLowerCase().includes(c))
            );

          const nameKey = findKey("학교명", "name", "학교", "이름", "명칭");
          const latKey  = findKey("위도", "lat", "latitude", "y");
          const lngKey  = findKey("경도", "lng", "lon", "longitude", "x");
          const typeKey = findKey("구분", "종류", "type", "학교구분", "학교종류", "유형");
          const distKey = findKey("구", "district", "지역", "행정구");

          if (!nameKey || !latKey || !lngKey) {
            setSchoolError(`필수 컬럼 없음\n필요: 학교명, 위도, 경도\n현재: ${Object.keys(firstRow).join(", ")}`);
            return;
          }

          const schools: School[] = rows.map((row, i) => {
            const name = String(row[nameKey!] || "").trim();
            const lat  = parseFloat(String(row[latKey!] || ""));
            const lng  = parseFloat(String(row[lngKey!] || ""));
            const typeStr = typeKey ? String(row[typeKey] || "") : "";
            const district = distKey ? String(row[distKey] || "").trim() || undefined : undefined;
            if (!name || isNaN(lat) || isNaN(lng)) return null;
            if (lat < 30 || lat > 40 || lng < 120 || lng > 135) return null;
            return { id: `excel-s${i}`, name, lat, lng, type: detectSchoolType(name, typeStr), district } as School;
          }).filter(Boolean) as School[];

          if (schools.length === 0) { setSchoolError("유효한 데이터가 없습니다. 위도/경도를 확인해 주세요."); return; }
          setSchoolSuccess(schools.length);
          onSchoolsLoaded(schools);
        } catch {
          setSchoolError("파일 파싱 중 오류가 발생했습니다.");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [onSchoolsLoaded]
  );

  const processTobaccoFile = useCallback(
    (file: File) => {
      setTobaccoError(null);
      setTobaccoSuccess(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

          if (rows.length === 0) { setTobaccoError("파일이 비어 있습니다."); return; }

          const firstRow = rows[0];
          const findKey = (...candidates: string[]) =>
            Object.keys(firstRow).find((k) =>
              candidates.some((c) => k.trim().toLowerCase().includes(c))
            );

          const nameKey    = findKey("업소명", "상호명", "매장명", "name", "이름", "명칭", "상호", "매장");
          const latKey     = findKey("위도", "lat", "latitude", "y");
          const lngKey     = findKey("경도", "lng", "lon", "longitude", "x");
          const addressKey = findKey("주소", "address", "addr", "도로명", "지번");

          if (!nameKey || !latKey || !lngKey) {
            setTobaccoError(`필수 컬럼 없음\n필요: 업소명, 위도, 경도\n현재: ${Object.keys(firstRow).join(", ")}`);
            return;
          }

          const shops: TobaccoShop[] = rows.map((row, i) => {
            const name    = String(row[nameKey!] || "").trim();
            const lat     = parseFloat(String(row[latKey!] || ""));
            const lng     = parseFloat(String(row[lngKey!] || ""));
            const address = addressKey ? String(row[addressKey] || "").trim() || undefined : undefined;
            if (!name || isNaN(lat) || isNaN(lng)) return null;
            if (lat < 30 || lat > 40 || lng < 120 || lng > 135) return null;
            return { id: `excel-t${i}`, name, lat, lng, address } as TobaccoShop;
          }).filter(Boolean) as TobaccoShop[];

          if (shops.length === 0) { setTobaccoError("유효한 데이터가 없습니다. 위도/경도를 확인해 주세요."); return; }
          setTobaccoSuccess(shops.length);
          onTobaccoShopsLoaded?.(shops);
        } catch {
          setTobaccoError("파일 파싱 중 오류가 발생했습니다.");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [onTobaccoShopsLoaded]
  );

  const handleSchoolFile = useCallback((file: File | undefined) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) { setSchoolError("xlsx, xls, csv만 지원합니다."); return; }
    processSchoolFile(file);
  }, [processSchoolFile]);

  const handleTobaccoFile = useCallback((file: File | undefined) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) { setTobaccoError("xlsx, xls, csv만 지원합니다."); return; }
    processTobaccoFile(file);
  }, [processTobaccoFile]);

  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[10px] font-medium">
        <button
          onClick={() => setMode("school")}
          className={`flex-1 py-1.5 transition-colors ${mode === "school" ? "bg-green-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
        >
          학교
        </button>
        <button
          onClick={() => setMode("tobacco")}
          className={`flex-1 py-1.5 transition-colors ${mode === "tobacco" ? "bg-orange-500 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
        >
          전자담배샵
        </button>
      </div>

      {/* School Upload */}
      {mode === "school" && (
        <div className="space-y-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingSchool(true); }}
            onDragLeave={() => setIsDraggingSchool(false)}
            onDrop={(e) => { e.preventDefault(); setIsDraggingSchool(false); handleSchoolFile(e.dataTransfer.files[0]); }}
            onClick={() => schoolInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 cursor-pointer text-center transition-all ${isDraggingSchool ? "border-green-500 bg-green-50" : "border-slate-200 hover:border-green-400 hover:bg-slate-50"}`}
          >
            <FileSpreadsheet className="mx-auto h-6 w-6 text-slate-400 mb-1.5" />
            <p className="text-[11px] font-medium text-slate-700">학교 데이터 업로드</p>
            <p className="text-[10px] text-slate-400 mt-0.5">xlsx, xls, csv</p>
            <input ref={schoolInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => handleSchoolFile(e.target.files?.[0])} />
          </div>

          {schoolSuccess !== null && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-2 py-1.5">
              <p className="text-[10px] text-green-700 font-semibold">✓ 학교 {schoolSuccess}개 로드됨</p>
            </div>
          )}
          {schoolError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-700 whitespace-pre-wrap">{schoolError}</p>
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-2 text-[10px] text-slate-500 space-y-0.5">
            <p className="font-semibold text-slate-600">컬럼 안내</p>
            <p>• 필수: <span className="font-mono">학교명, 위도, 경도</span></p>
            <p>• 선택: <span className="font-mono">학교구분, 구</span></p>
          </div>
        </div>
      )}

      {/* Tobacco Upload */}
      {mode === "tobacco" && (
        <div className="space-y-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingTobacco(true); }}
            onDragLeave={() => setIsDraggingTobacco(false)}
            onDrop={(e) => { e.preventDefault(); setIsDraggingTobacco(false); handleTobaccoFile(e.dataTransfer.files[0]); }}
            onClick={() => tobaccoInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 cursor-pointer text-center transition-all ${isDraggingTobacco ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:border-orange-400 hover:bg-slate-50"}`}
          >
            <span className="block text-2xl mb-1">🚬</span>
            <p className="text-[11px] font-medium text-slate-700">전자담배샵 데이터 업로드</p>
            <p className="text-[10px] text-slate-400 mt-0.5">xlsx, xls, csv</p>
            <input ref={tobaccoInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => handleTobaccoFile(e.target.files?.[0])} />
          </div>

          {tobaccoSuccess !== null && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-2 py-1.5">
              <p className="text-[10px] text-orange-700 font-semibold">✓ 업소 {tobaccoSuccess}개 로드됨</p>
            </div>
          )}
          {tobaccoError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-700 whitespace-pre-wrap">{tobaccoError}</p>
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-2 text-[10px] text-slate-500 space-y-0.5">
            <p className="font-semibold text-slate-600">컬럼 안내</p>
            <p>• 이름: <span className="font-mono">업소명 / 매장명 / 상호명</span></p>
            <p>• 위치: <span className="font-mono">위도, 경도</span> (필수)</p>
            <p>• 선택: <span className="font-mono">주소</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
