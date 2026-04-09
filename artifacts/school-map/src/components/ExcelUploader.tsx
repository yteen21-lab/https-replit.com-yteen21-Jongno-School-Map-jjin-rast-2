import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { School, SchoolType } from "@/types/school";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";

interface ExcelUploaderProps {
  onSchoolsLoaded: (schools: School[]) => void;
}

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

export default function ExcelUploader({ onSchoolsLoaded }: ExcelUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

          if (rows.length === 0) {
            setError("엑셀 파일이 비어 있습니다.");
            return;
          }

          const firstRow = rows[0];
          const keys = Object.keys(firstRow).map((k) => k.trim().toLowerCase());

          const findKey = (...candidates: string[]) =>
            Object.keys(firstRow).find((k) =>
              candidates.some((c) => k.trim().toLowerCase().includes(c))
            );

          const nameKey = findKey("학교명", "name", "학교", "이름", "명칭");
          const latKey = findKey("위도", "lat", "latitude", "y");
          const lngKey = findKey("경도", "lng", "lon", "longitude", "x");
          const typeKey = findKey("구분", "종류", "type", "학교구분", "학교종류", "유형");

          if (!nameKey || !latKey || !lngKey) {
            setError(
              `필수 컬럼을 찾을 수 없습니다.\n필요한 컬럼: 학교명(name), 위도(lat), 경도(lng)\n현재 컬럼: ${Object.keys(firstRow).join(", ")}`
            );
            return;
          }

          const schools: School[] = rows
            .map((row, i) => {
              const name = String(row[nameKey!] || "").trim();
              const lat = parseFloat(String(row[latKey!] || ""));
              const lng = parseFloat(String(row[lngKey!] || ""));
              const typeStr = typeKey ? String(row[typeKey] || "") : "";

              if (!name || isNaN(lat) || isNaN(lng)) return null;
              if (lat < 30 || lat > 40 || lng < 120 || lng > 135) return null;

              return {
                id: `excel-${i}`,
                name,
                lat,
                lng,
                type: detectSchoolType(name, typeStr),
              } as School;
            })
            .filter(Boolean) as School[];

          if (schools.length === 0) {
            setError("유효한 학교 데이터가 없습니다. 위도/경도 값을 확인해 주세요.");
            return;
          }

          onSchoolsLoaded(schools);
        } catch (err) {
          setError("파일을 파싱하는 중 오류가 발생했습니다.");
        }
      };

      reader.readAsArrayBuffer(file);
    },
    [onSchoolsLoaded]
  );

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["xlsx", "xls", "csv"].includes(ext || "")) {
        setError("xlsx, xls, csv 파일만 지원합니다.");
        return;
      }
      processFile(file);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-4 cursor-pointer text-center transition-all
          ${isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
          }
        `}
      >
        <FileSpreadsheet className="mx-auto h-8 w-8 text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-700">엑셀 파일 업로드</p>
        <p className="text-xs text-slate-400 mt-1">xlsx, xls, csv 지원</p>
        <p className="text-xs text-slate-400">드래그하거나 클릭하세요</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 whitespace-pre-wrap">{error}</p>
        </div>
      )}

      <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-600">엑셀 형식 안내</p>
        <p>• 필수 컬럼: <span className="font-mono">학교명, 위도, 경도</span></p>
        <p>• 선택 컬럼: <span className="font-mono">학교구분</span> (초등/중학/고등)</p>
        <p>• 위도·경도는 십진수 형식 (예: 37.5735, 126.979)</p>
      </div>
    </div>
  );
}
