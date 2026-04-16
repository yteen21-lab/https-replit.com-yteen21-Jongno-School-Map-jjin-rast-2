import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { School, SchoolType, TobaccoShop } from "@/types/school";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";

interface ExcelUploaderProps {
  onSchoolsLoaded: (schools: School[]) => void;
  onTobaccoShopsLoaded?: (shops: TobaccoShop[]) => void;
  existingSchools?: School[];
  existingTobacco?: TobaccoShop[];
}

type UploadMode = "school" | "tobacco";

function autoDetectShopType(name: string, rawTypeCol: string): "무인" | "유인" {
  const col = rawTypeCol.trim();

  // 1) 유형 컬럼 명시값 최우선 ─────────────────────────────────
  // 오프라인매장 / 일반매장 → 유인 (직원 상주 오프라인 점포)
  if (
    col.includes("오프라인매장") || col.includes("오프라인") ||
    col.includes("일반매장") || col.includes("일반 매장") ||
    col.includes("유인") ||
    col.toLowerCase().includes("offline") ||
    col.toLowerCase().includes("staff") ||
    col.toLowerCase().includes("manned")
  ) return "유인";

  // 무인자판기 / 자판기 / 무인 / 24시 / GATE / 24 → 무인 (자동판매기 형태)
  if (
    col.includes("무인자판기") || col.includes("자판기") ||
    col.includes("무인") || col.includes("키오스크") ||
    col.includes("24시") || col.includes("24") ||
    col.toUpperCase().includes("GATE") ||
    col.toLowerCase().includes("unmanned") ||
    col.toLowerCase().includes("vending") ||
    col.toLowerCase().includes("kiosk")
  ) return "무인";

  // 2) 이름에서 유인(직원 상주 점포) 키워드 → 유인 ────────────
  const n = name;
  if (
    n.includes("편의점") || n.includes("마트") || n.includes("슈퍼") || n.includes("수퍼") ||
    n.includes("세븐일레븐") || n.includes("이마트") || n.includes("롯데") ||
    n.toLowerCase().includes("gs25") || n.toLowerCase().includes(" cu") ||
    n.includes("오프라인") || n.includes("유인")
  ) return "유인";

  // 3) 이름에서 무인(자판기) 키워드 → 무인 ─────────────────────
  if (
    n.includes("무인") || n.includes("자판기") || n.includes("키오스크") ||
    n.toLowerCase().includes("kiosk") || n.toLowerCase().includes("vending") ||
    n.toLowerCase().includes("unmanned")
  ) return "무인";

  // 4) 불명확 → 기본값 "유인" (오프라인매장)
  return "유인";
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
  secondary: "중학교",
  "high school": "고등학교",
};

/**
 * 학교 구분 자동 판별.
 * 우선순위: 유형 컬럼 명시값 → 학교명·주소의 정식 표기 → 약칭·어미 패턴
 *
 * @param name    학교명
 * @param typeStr 유형 컬럼값 (있으면 최우선)
 * @param address 주소 (학교명에 유형 표기가 없을 때 보조)
 */
function detectSchoolType(name: string, typeStr?: string, address?: string): SchoolType {
  /* ── 1. 유형 컬럼이 있으면 최우선 적용 ────────────────────────── */
  if (typeStr) {
    const t = typeStr.trim().toLowerCase();
    /* 각종학교(초), 각종학교(중), 각종학교(고) 처리 */
    if (/각종.{0,4}초/.test(t) || t.includes("초등"))        return "초등학교";
    if (/각종.{0,4}중/.test(t) || t.includes("중학"))        return "중학교";
    if (/각종.{0,4}고/.test(t) || t.includes("고등"))        return "고등학교";
    if (t.includes("특수") || t.includes("대안") || t.includes("유치")) return "기타";
    /* MAP 룩업 (부분 문자열 매칭) */
    for (const [key, val] of Object.entries(SCHOOL_TYPE_MAP)) {
      if (t.includes(key.toLowerCase())) return val;
    }
  }

  /* ── 2. 학교명 + 주소를 합쳐서 정식 표기 검색 ─────────────────── */
  const combined = `${name} ${address ?? ""}`;

  /* 정식 표기: 이 단어들이 있으면 100% 확정 */
  if (combined.includes("초등학교")) return "초등학교";
  if (combined.includes("중학교"))   return "중학교";
  if (combined.includes("고등학교")) return "고등학교";

  /* 명백한 기타: 특수·대안·유치원·국제학교 */
  if (
    combined.includes("특수학교") ||
    combined.includes("대안학교") ||
    combined.includes("유치원")   ||
    combined.includes("국제학교")
  ) return "기타";

  /* ── 3. 약칭·어미 패턴 (이름만 대상) ─────────────────────────── */
  const n = name.trim();

  /* 초등: "OO초", "OO초교", "OO초등" */
  if (/초$/.test(n) || n.includes("초교") || n.includes("초등")) return "초등학교";

  /* 중학: "OO중", "OO여중", "사범부속중" 등 */
  if (/중$/.test(n) || n.includes("중학")) return "중학교";

  /* 고등: "OO고", "OO여고", "특성화고", "과학고", "예술고" 등 */
  if (/고$/.test(n) || n.includes("고등") || n.includes("고교")) return "고등학교";

  return "기타";
}

const HEADER_KEYWORDS = [
  "학교명", "업소명", "상호명", "매장명", "이름", "명칭",
  "위도", "경도", "lat", "lng", "latitude", "longitude",
  "주소", "address", "구", "district",
  "구분", "유형", "종류", "type", "좌표",
];

/**
 * 워크북에서 실제 데이터가 있는 시트를 선택.
 * - !ref 누락 시 셀 스캔으로 강제 복구
 * - 모든 시트 중 데이터 행이 가장 많은 시트를 반환
 */
function pickBestSheet(workbook: XLSX.WorkBook): { sheet: XLSX.WorkSheet; name: string } | null {
  let best: { sheet: XLSX.WorkSheet; name: string; count: number } | null = null;

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;

    /* !ref 누락 시 셀 키를 스캔해 복구 */
    if (!sheet["!ref"]) {
      let maxR = 0, maxC = 0, found = false;
      for (const key of Object.keys(sheet)) {
        if (key.startsWith("!")) continue;
        try {
          const cell = XLSX.utils.decode_cell(key);
          maxR = Math.max(maxR, cell.r);
          maxC = Math.max(maxC, cell.c);
          found = true;
        } catch { /* 무시 */ }
      }
      if (found) {
        sheet["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
      }
    }

    const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
    const count = raw.filter((row) => (row as string[]).some((c) => String(c).trim() !== "")).length;

    if (count > 0 && (!best || count > best.count)) {
      best = { sheet, name, count };
    }
  }

  return best ? { sheet: best.sheet, name: best.name } : null;
}

/**
 * 시트를 읽어 헤더 행을 자동 탐지한 뒤 { [컬럼명]: 값 }[] 반환.
 * - 제목행·빈행이 앞에 있는 한국 공공 데이터 양식 지원 (최대 20행 탐색)
 */
function sheetToRows(sheet: XLSX.WorkSheet): {
  rows: Record<string, string>[];
  detectedHeaders: string[];
  rawRowCount: number;
} {
  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as string[][];
  if (raw.length === 0) return { rows: [], detectedHeaders: [], rawRowCount: 0 };

  /* 최대 20행에서 키워드 점수가 가장 높은 행을 헤더로 선택 */
  let bestRow = -1;
  let bestScore = -1;
  for (let i = 0; i < Math.min(raw.length, 20); i++) {
    const nonEmpty = raw[i].filter((c) => String(c).trim() !== "").length;
    if (nonEmpty < 1) continue;
    const rowText = raw[i].map((c) => String(c).trim().toLowerCase()).join(" ");
    const score = HEADER_KEYWORDS.filter((k) => rowText.includes(k.toLowerCase())).length;
    if (bestRow === -1) bestRow = i;          /* 첫 비어있지 않은 행을 기본 후보로 */
    if (score > bestScore) { bestScore = score; bestRow = i; }
  }
  if (bestRow === -1) bestRow = 0;

  const headers = raw[bestRow].map((c) => String(c).trim());

  const rows: Record<string, string>[] = [];
  for (let i = bestRow + 1; i < raw.length; i++) {
    const row = raw[i];
    const obj: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      if (!h) return;
      const cell = String(row[idx] ?? "").trim();
      obj[h] = cell;
      if (cell) hasValue = true;
    });
    if (hasValue) rows.push(obj);
  }

  return { rows, detectedHeaders: headers.filter(Boolean), rawRowCount: raw.length };
}

/**
 * 하나의 문자열 값에서 위도/경도 쌍을 추출.
 * 예: "37.5665,126.9780" / "37.5665 126.9780" / "37.5665/126.9780"
 * 위도(30~40) · 경도(120~135) 범위로 어느 값이 위도인지 자동 판별.
 */
function extractLatLng(value: string): [number, number] | null {
  const nums = Array.from(value.matchAll(/\d+\.?\d*/g))
    .map((m) => parseFloat(m[0]))
    .filter((n) => !isNaN(n) && n > 0);

  for (let i = 0; i < nums.length - 1; i++) {
    const a = nums[i], b = nums[i + 1];
    if (a >= 30 && a <= 40 && b >= 120 && b <= 135) return [a, b];
    if (b >= 30 && b <= 40 && a >= 120 && a <= 135) return [b, a];
  }
  return null;
}

/**
 * 분리된 두 좌표 값에서 한국 위도/경도 쌍을 추출.
 * - 열이 반대로 매핑된 경우(경도↔위도) 자동 교정
 * - 값이 배수(×100, ×10000, ×100000, ×1000000)로 스케일된 경우 자동 나눗셈
 */
function resolveKoreanCoords(rawA: string, rawB: string): [number, number] | null {
  const a0 = parseFloat(rawA.replace(/[, ]/g, ""));
  const b0 = parseFloat(rawB.replace(/[, ]/g, ""));
  if (isNaN(a0) || isNaN(b0)) return null;

  /* 스케일 후보: 1, 1/100, 1/10000, 1/100000, 1/1000000 */
  const scales = [1, 0.01, 0.0001, 0.00001, 0.000001];
  for (const sa of scales) {
    for (const sb of scales) {
      const a = a0 * sa, b = b0 * sb;
      if (a >= 30 && a <= 40 && b >= 120 && b <= 135) return [a, b];
      if (b >= 30 && b <= 40 && a >= 120 && a <= 135) return [b, a];
    }
  }
  return null;
}

/**
 * 이름 + 좌표(소수점 4자리 ≈ ±11m) 기반 중복 키.
 * 이름이 같아도 위치가 다르면 다른 데이터로 취급.
 */
function dedupKey(name: string, lat: number, lng: number): string {
  return `${name.trim().toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
}

export default function ExcelUploader({ onSchoolsLoaded, onTobaccoShopsLoaded, existingSchools = [], existingTobacco = [] }: ExcelUploaderProps) {
  const schoolInputRef = useRef<HTMLInputElement>(null);
  const tobaccoInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<UploadMode>("school");
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [tobaccoError, setTobaccoError] = useState<string | null>(null);
  const [isDraggingSchool, setIsDraggingSchool] = useState(false);
  const [isDraggingTobacco, setIsDraggingTobacco] = useState(false);
  const [schoolSuccess, setSchoolSuccess] = useState<{ added: number; skipped: number } | null>(null);
  const [tobaccoSuccess, setTobaccoSuccess] = useState<{ total: number; muIn: number; yuIn: number; skipped: number } | null>(null);
  const [shopTypeOverride, setShopTypeOverride] = useState<"auto" | "무인" | "유인">("auto");

  const processSchoolFile = useCallback(
    (file: File) => {
      setSchoolError(null);
      setSchoolSuccess(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array", raw: false });
          const sheetNames = workbook.SheetNames;

          const picked = pickBestSheet(workbook);
          if (!picked) {
            setSchoolError(
              `데이터 시트를 찾을 수 없습니다.\n` +
              `시트 목록: ${sheetNames.join(", ") || "(없음)"}\n` +
              "데이터가 있는 시트에 !ref 정보가 없거나 빈 파일일 수 있습니다."
            );
            return;
          }

          const { rows, detectedHeaders, rawRowCount } = sheetToRows(picked.sheet);

          if (rows.length === 0) {
            setSchoolError(
              `시트 "${picked.name}"에서 데이터 행을 찾지 못했습니다 (원시 행 수: ${rawRowCount}).\n` +
              "헤더 행 바로 아래에 데이터가 있는지 확인해 주세요."
            );
            return;
          }

          const findKey = (...candidates: string[]) =>
            detectedHeaders.find((k) =>
              candidates.some((c) => k.trim().toLowerCase().includes(c.toLowerCase()))
            );

          const nameKey = findKey("학교명", "학교 명", "name", "학교", "이름", "명칭", "학교이름");

          /* ── 좌표 열 탐지: 합산 열을 먼저 확인 ──────────────────────────
           * "위도,경도" 같은 열 이름은 "위도" / "경도" 키워드도 포함하므로
           * 합산 열을 먼저 잡지 않으면 같은 열이 latKey·lngKey 양쪽에 매핑됨 */
          const coordKey = findKey(
            "위도,경도", "경도,위도", "좌표", "coordinates", "coord",
            "lat,lng", "latlng", "위경도", "latlon", "lat_lng"
          );
          /* latKey / lngKey 은 합산 열이 없을 때만 탐색.
           * 또한, 합산 열과 같은 열 이름이면 분리 열로 사용하지 않음 */
          const latKey = !coordKey
            ? findKey("위도", "lat", "latitude", "y좌표", "y_좌표", "위도(y)")
            : undefined;
          const lngKey = !coordKey
            ? findKey("경도", "lng", "lon", "longitude", "x좌표", "x_좌표", "경도(x)")
            : undefined;
          /* latKey·lngKey 가 같은 열로 매핑된 경우도 합산 열로 처리 */
          const effectiveCoordKey = coordKey ?? (latKey && latKey === lngKey ? latKey : undefined);
          const effectiveLatKey   = effectiveCoordKey ? undefined : latKey;
          const effectiveLngKey   = effectiveCoordKey ? undefined : lngKey;

          const typeKey = findKey("구분", "종류", "type", "학교구분", "학교종류", "유형", "학교유형");
          const distKey = findKey("구", "district", "지역", "행정구", "자치구");
          const addrKey = findKey("주소", "address", "addr", "도로명", "지번", "소재지");
          const propRadKey = findKey("부지반경", "부지 반경", "부지", "propertyRadius", "property_radius", "반경", "교지반경");

          if (!nameKey || (!effectiveLatKey && !effectiveLngKey && !effectiveCoordKey)) {
            const missing: string[] = [];
            if (!nameKey) missing.push("학교명(이름)");
            if (!latKey && !lngKey && !coordKey) missing.push("위도·경도 (또는 합산 좌표열)");
            setSchoolError(
              `필수 컬럼 없음: ${missing.join(", ")}\n감지된 컬럼: ${detectedHeaders.join(", ") || "(없음)"}`
            );
            return;
          }

          const schools: School[] = rows.map((row, i) => {
            const name = String(row[nameKey!] || "").trim();
            if (!name) return null;

            let lat: number, lng: number;
            if (effectiveCoordKey && row[effectiveCoordKey]) {
              /* 합산 열: "37.5665,126.9780" 형식 — 스케일·순서 자동 교정 */
              const pair = extractLatLng(String(row[effectiveCoordKey]));
              if (!pair) return null;
              [lat, lng] = pair;
            } else if (effectiveLatKey && effectiveLngKey) {
              /* 분리 열 — 열 순서 반전·스케일 자동 교정 */
              const pair = resolveKoreanCoords(
                String(row[effectiveLatKey] || ""),
                String(row[effectiveLngKey] || "")
              );
              if (!pair) return null;
              [lat, lng] = pair;
            } else {
              return null;
            }

            const typeStr = typeKey ? String(row[typeKey] || "") : "";
            const addrStr = addrKey ? String(row[addrKey] || "").trim() : "";
            const district = distKey
              ? String(row[distKey] || "").trim() || undefined
              : addrStr ? addrStr.match(/([가-힣]+구)/)?.[1] : undefined;

            const prRaw = propRadKey ? parseFloat(String(row[propRadKey] || "")) : NaN;
            const propertyRadius = !isNaN(prRaw) && prRaw > 0 ? prRaw : undefined;

            return {
              id: `excel-s${Date.now()}-${i}`,
              name, lat, lng,
              type: detectSchoolType(name, typeStr, addrStr),
              district,
              propertyRadius,
            } as School;
          }).filter(Boolean) as School[];

          if (schools.length === 0) {
            const sampleRow = rows[0];
            const sampleCoord = effectiveCoordKey ? String(sampleRow?.[effectiveCoordKey] ?? "") : "";
            const sampleA     = effectiveLatKey ? String(sampleRow?.[effectiveLatKey] ?? "") : sampleCoord;
            const sampleB     = effectiveLngKey ? String(sampleRow?.[effectiveLngKey] ?? "") : "";
            setSchoolError(
              `유효한 행이 없습니다 (전체 ${rows.length}행 처리).\n` +
              (effectiveCoordKey
                ? `합산 좌표 열 "${effectiveCoordKey}" 첫 값: "${sampleCoord}"`
                : `첫 행 좌표 샘플 — ${effectiveLatKey ?? "위도"}: "${sampleA}", ${effectiveLngKey ?? "경도"}: "${sampleB}"`) +
              "\n좌표가 한국 범위(위도 30~40, 경도 120~135)에 있는지 확인해 주세요."
            );
            return;
          }
          /* ── 중복 제거 ──────────────────────────────────────────────
           * 1) 파일 내 중복 (같은 키가 두 번 이상 등장하면 첫 번째만 유지)
           * 2) 기존 데이터와의 중복 (이미 있는 항목은 건너뜀) */
          const existingKeys = new Set(existingSchools.map((s) => dedupKey(s.name, s.lat, s.lng)));
          const fileKeys = new Set<string>();
          const unique = schools.filter((s) => {
            const k = dedupKey(s.name, s.lat, s.lng);
            if (existingKeys.has(k) || fileKeys.has(k)) return false;
            fileKeys.add(k);
            return true;
          });
          const skipped = schools.length - unique.length;
          if (unique.length === 0) {
            setSchoolError(`모든 행(${schools.length}개)이 이미 등록된 데이터와 중복입니다.`);
            return;
          }
          setSchoolSuccess({ added: unique.length, skipped });
          onSchoolsLoaded(unique);
        } catch (err) {
          setSchoolError(`파일 파싱 오류: ${err instanceof Error ? err.message : String(err)}`);
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
          const workbook = XLSX.read(data, { type: "array", raw: false });
          const sheetNames = workbook.SheetNames;

          const picked = pickBestSheet(workbook);
          if (!picked) {
            setTobaccoError(
              `데이터 시트를 찾을 수 없습니다.\n` +
              `시트 목록: ${sheetNames.join(", ") || "(없음)"}\n` +
              "데이터가 있는 시트에 !ref 정보가 없거나 빈 파일일 수 있습니다."
            );
            return;
          }

          const { rows, detectedHeaders, rawRowCount } = sheetToRows(picked.sheet);

          if (rows.length === 0) {
            setTobaccoError(
              `시트 "${picked.name}"에서 데이터 행을 찾지 못했습니다 (원시 행 수: ${rawRowCount}).\n` +
              "헤더 행 바로 아래에 데이터가 있는지 확인해 주세요."
            );
            return;
          }

          const findKey = (...candidates: string[]) =>
            detectedHeaders.find((k) =>
              candidates.some((c) => k.trim().toLowerCase().includes(c.toLowerCase()))
            );

          const nameKey = findKey("업소명", "상호명", "매장명", "name", "이름", "명칭", "상호", "매장");

          /* 합산 열 우선 탐지 */
          const coordKey = findKey(
            "위도,경도", "경도,위도", "좌표", "coordinates", "coord",
            "lat,lng", "latlng", "위경도", "latlon", "lat_lng"
          );
          const latKey = !coordKey
            ? findKey("위도", "lat", "latitude", "y좌표", "y_좌표", "위도(y)")
            : undefined;
          const lngKey = !coordKey
            ? findKey("경도", "lng", "lon", "longitude", "x좌표", "x_좌표", "경도(x)")
            : undefined;
          const effectiveCoordKey = coordKey ?? (latKey && latKey === lngKey ? latKey : undefined);
          const effectiveLatKey   = effectiveCoordKey ? undefined : latKey;
          const effectiveLngKey   = effectiveCoordKey ? undefined : lngKey;

          const addressKey  = findKey("주소", "address", "addr", "도로명", "지번", "소재지");
          const shopTypeKey = findKey(
            "매장유형", "운영유형", "판매유형", "업소유형", "유형구분",
            "유형", "판매방식", "종류", "구분", "형태",
            "shoptype", "type", "category"
          );

          if (!nameKey || (!effectiveLatKey && !effectiveLngKey && !effectiveCoordKey)) {
            const missing: string[] = [];
            if (!nameKey) missing.push("업소명(이름)");
            if (!effectiveLatKey && !effectiveLngKey && !effectiveCoordKey) missing.push("위도·경도 (또는 합산 좌표열)");
            setTobaccoError(
              `필수 컬럼 없음: ${missing.join(", ")}\n감지된 컬럼: ${detectedHeaders.join(", ") || "(없음)"}`
            );
            return;
          }

          const shops: TobaccoShop[] = rows.map((row, i) => {
            const name = String(row[nameKey!] || "").trim();
            if (!name) return null;

            let lat: number, lng: number;
            if (effectiveCoordKey && row[effectiveCoordKey]) {
              /* 합산 열: "37.5665,126.9780" 형식 — 스케일·순서 자동 교정 */
              const pair = extractLatLng(String(row[effectiveCoordKey]));
              if (!pair) return null;
              [lat, lng] = pair;
            } else if (effectiveLatKey && effectiveLngKey) {
              /* 분리 열 — 열 순서 반전·스케일 자동 교정 */
              const pair = resolveKoreanCoords(
                String(row[effectiveLatKey] || ""),
                String(row[effectiveLngKey] || "")
              );
              if (!pair) return null;
              [lat, lng] = pair;
            } else {
              return null;
            }

            const address  = addressKey ? String(row[addressKey] || "").trim() || undefined : undefined;
            const rawType  = shopTypeKey ? String(row[shopTypeKey] || "").trim() : "";
            const shopType = shopTypeOverride !== "auto" ? shopTypeOverride : autoDetectShopType(name, rawType);
            return { id: `excel-t${Date.now()}-${i}`, name, lat, lng, address, shopType } as TobaccoShop;
          }).filter(Boolean) as TobaccoShop[];

          if (shops.length === 0) {
            const sampleRow = rows[0];
            const sampleCoord = effectiveCoordKey ? String(sampleRow?.[effectiveCoordKey] ?? "") : "";
            const sampleA     = effectiveLatKey ? String(sampleRow?.[effectiveLatKey] ?? "") : sampleCoord;
            const sampleB     = effectiveLngKey ? String(sampleRow?.[effectiveLngKey] ?? "") : "";
            setTobaccoError(
              `유효한 행이 없습니다 (전체 ${rows.length}행 처리).\n` +
              (effectiveCoordKey
                ? `합산 좌표 열 "${effectiveCoordKey}" 첫 값: "${sampleCoord}"`
                : `첫 행 좌표 샘플 — ${effectiveLatKey ?? "위도"}: "${sampleA}", ${effectiveLngKey ?? "경도"}: "${sampleB}"`) +
              "\n좌표가 한국 범위(위도 30~40, 경도 120~135)에 있는지 확인해 주세요."
            );
            return;
          }
          /* ── 중복 제거 ─────────────────────────────────────────────── */
          const existingTKeys = new Set(existingTobacco.map((s) => dedupKey(s.name, s.lat, s.lng)));
          const fileTKeys = new Set<string>();
          const unique = shops.filter((s) => {
            const k = dedupKey(s.name, s.lat, s.lng);
            if (existingTKeys.has(k) || fileTKeys.has(k)) return false;
            fileTKeys.add(k);
            return true;
          });
          const skipped = shops.length - unique.length;
          if (unique.length === 0) {
            setTobaccoError(`모든 행(${shops.length}개)이 이미 등록된 데이터와 중복입니다.`);
            return;
          }
          const muIn = unique.filter(s => s.shopType !== "유인").length;
          const yuIn = unique.filter(s => s.shopType === "유인").length;
          setTobaccoSuccess({ total: unique.length, muIn, yuIn, skipped });
          onTobaccoShopsLoaded?.(unique);
        } catch (err) {
          setTobaccoError(`파일 파싱 오류: ${err instanceof Error ? err.message : String(err)}`);
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [onTobaccoShopsLoaded, shopTypeOverride]
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
            <div className="bg-green-50 border border-green-200 rounded-lg px-2 py-1.5 space-y-0.5">
              <p className="text-[10px] text-green-700 font-semibold">✓ 학교 {schoolSuccess.added}개 추가됨</p>
              {schoolSuccess.skipped > 0 && (
                <p className="text-[10px] text-slate-500">⚠ 중복 {schoolSuccess.skipped}개 건너뜀</p>
              )}
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
            <p>• 이름: <span className="font-mono">학교명 / 이름 / name</span></p>
            <p>• 위치 <span className="text-green-700 font-semibold">(택1)</span></p>
            <p className="pl-2">① 분리: <span className="font-mono">위도</span> + <span className="font-mono">경도</span> (별도 열)</p>
            <p className="pl-2">② 합산: <span className="font-mono">위도,경도</span> 또는 <span className="font-mono">좌표</span> 한 열에 <span className="font-mono">37.56,126.97</span> 형식</p>
            <p>• 선택: <span className="font-mono">학교구분, 구, 주소</span></p>
            <p className="text-[9px] text-slate-400 pt-0.5">※ 제목행·빈행이 앞에 있어도 자동 건너뜀</p>
          </div>
        </div>
      )}

      {/* Tobacco Upload */}
      {mode === "tobacco" && (
        <div className="space-y-2">

          {/* 매장 유형 강제 지정 옵션 */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-600">업로드 매장 유형 지정</p>
            <div className="flex gap-1.5">
              {([
                { value: "auto",  label: "🔍 자동 감지",     desc: "컬럼·이름으로 판별" },
                { value: "유인",  label: "🏪 전체 오프라인",  desc: "모두 오프라인매장" },
                { value: "무인",  label: "🚬 전체 무인자판기", desc: "모두 무인자판기" },
              ] as const).map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setShopTypeOverride(value)}
                  className={`flex-1 rounded-md border py-1.5 px-1 text-center transition-all ${
                    shopTypeOverride === value
                      ? value === "유인"
                        ? "bg-purple-100 border-purple-400 text-purple-700"
                        : value === "무인"
                        ? "bg-blue-100 border-blue-400 text-blue-700"
                        : "bg-green-100 border-green-400 text-green-700"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <p className="text-[10px] font-semibold leading-tight">{label}</p>
                  <p className="text-[9px] leading-tight mt-0.5 opacity-70">{desc}</p>
                </button>
              ))}
            </div>
            {shopTypeOverride !== "auto" && (
              <p className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-1">
                ⚠️ 파일 내 매장유형 컬럼 무시 — 전체 <strong>{shopTypeOverride === "유인" ? "오프라인매장(유인)" : "무인자판기(무인)"}</strong>으로 처리
              </p>
            )}
          </div>

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
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-2 py-1.5 space-y-0.5">
              <p className="text-[10px] text-orange-700 font-semibold">✓ 업소 {tobaccoSuccess.total}개 추가됨</p>
              <p className="text-[10px] text-slate-500">🚬 무인 {tobaccoSuccess.muIn}개 · 🏪 유인 {tobaccoSuccess.yuIn}개</p>
              {tobaccoSuccess.skipped > 0 && (
                <p className="text-[10px] text-slate-500">⚠ 중복 {tobaccoSuccess.skipped}개 건너뜀</p>
              )}
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
            <p>• 주소: <span className="font-mono">주소 / 도로명</span> (선택)</p>

            <div className="mt-1.5 pt-1.5 border-t border-slate-200 space-y-0.5">
              <p className="font-semibold text-slate-600">매장유형 컬럼</p>
              <p className="text-slate-400">컬럼명: <span className="font-mono">매장유형 / 운영유형 / 유형구분 / 구분</span></p>
              <div className="mt-1 space-y-0.5">
                <div className="flex items-start gap-1">
                  <span className="text-[9px] font-bold text-slate-500 w-3 flex-shrink-0 mt-0.5">🏪</span>
                  <div>
                    <p className="font-semibold text-purple-600">오프라인매장 → 유인</p>
                    <p className="text-slate-400 flex items-center gap-1">값:
                      <span className="font-mono bg-white border border-slate-300 text-slate-700 rounded px-1 py-0.5">오프라인매장</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-1">
                  <span className="text-[9px] font-bold text-slate-500 w-3 flex-shrink-0 mt-0.5">🚬</span>
                  <div>
                    <p className="font-semibold text-slate-600">무인자판기 → 무인</p>
                    <p className="text-slate-400 flex items-center gap-1">값:
                      <span className="font-mono bg-blue-100 text-blue-700 rounded px-1 py-0.5">무인자판기매장</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-1.5 pt-1.5 border-t border-slate-200 space-y-0.5">
              <p className="font-semibold text-slate-500">컬럼 없을 시 이름 자동 감지</p>
              <p>• 🚬 <span className="font-mono">"무인"·"자판기"·"키오스크"</span> 포함 → 무인</p>
              <p>• 🏪 <span className="font-mono">"오프라인"·"편의점"·"마트"</span> 포함 → 유인</p>
              <p className="text-slate-400">그 외 불명확 → <span className="bg-white border border-slate-300 text-slate-700 rounded px-1">오프라인매장</span> (기본값)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
