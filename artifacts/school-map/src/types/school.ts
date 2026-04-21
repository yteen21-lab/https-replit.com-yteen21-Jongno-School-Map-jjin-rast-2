export type SchoolType = "초등학교" | "중학교" | "고등학교" | "기타";
export type TobaccoZone = "50m이내" | "200m이내" | "외부";

export interface School {
  id: string;
  name: string;
  type: SchoolType;
  lat: number;
  lng: number;
  district?: string;
  propertyRadius?: number; // 학교 부지 반경 (m) — 보호구역은 부지 끝에서 측정
}

export interface TobaccoShop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  shopType?: "무인" | "유인";
}

export interface CircleConfig {
  radius: number;
  color: string;
  fillColor: string;
  label: string;
}

export const SCHOOL_TYPE_COLORS: Record<SchoolType, string> = {
  초등학교: "#2563EB",
  중학교:   "#16A34A",
  고등학교: "#DC2626",
  기타:     "#7C3AED",
};

export const TOBACCO_ZONE_COLORS: Record<TobaccoZone, string> = {
  "50m이내":  "#DC2626",
  "200m이내": "#F97316",
  "외부":     "#64748B",
};

export const CIRCLE_CONFIGS: CircleConfig[] = [
  { radius: 50,  color: "#EF4444", fillColor: "#FEE2E2", label: "반경 50m"  },
  { radius: 200, color: "#3B82F6", fillColor: "#DBEAFE", label: "반경 200m" },
];

/* ── 구 경계 폴리곤 계산 유틸 ── */
function cross2D(O: [number, number], A: [number, number], B: [number, number]): number {
  return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
}

function convexHull2D(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
  const lower: [number, number][] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross2D(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross2D(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function expandPolygon(hull: [number, number][], buffer: number): [number, number][] {
  const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length;
  return hull.map(([lat, lng]) => {
    const dx = lat - cx;
    const dy = lng - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.0001) return [lat + buffer, lng + buffer] as [number, number];
    const scale = (dist + buffer) / dist;
    return [cx + dx * scale, cy + dy * scale] as [number, number];
  });
}

export function computeDistrictPolygon(schools: School[]): [number, number][] | undefined {
  if (schools.length === 0) return undefined;
  const points: [number, number][] = schools.map(s => [s.lat, s.lng]);
  if (points.length === 1) {
    const [lat, lng] = points[0];
    const R = 0.013;
    return Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * 2 * Math.PI;
      return [lat + R * Math.cos(a), lng + R * Math.sin(a)] as [number, number];
    });
  }
  const pts: [number, number][] = points.length < 3
    ? [...points, [points[0][0] + 0.001, points[1][1] - 0.001] as [number, number]]
    : points;
  const hull = convexHull2D(pts);
  return expandPolygon(hull, 0.013);
}

/* ──────────────────────────────────────────────────
   학교 이름 정규화 유틸
────────────────────────────────────────────────── */

/**
 * 학교 이름에서 지역 접두사를 제거할 때 쓰는 목록.
 * 더 긴 접두사를 앞에 두어 탐욕 매칭(greedy) 방지.
 */
const SCHOOL_NAME_PREFIXES: string[] = [
  // 광역시·도 (긴 것부터)
  "충청북도", "충청남도", "전라북도", "전라남도", "경상북도", "경상남도",
  "충북", "충남", "전북", "전남", "경북", "경남", "강원특별자치도", "강원",
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
  "대전광역시", "울산광역시", "세종특별자치시",
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "제주",
  // 서울 25개 자치구
  "동대문", "서대문", "중랑", "성북", "강북", "도봉", "노원", "은평",
  "마포", "양천", "강서", "구로", "금천", "영등포", "동작", "관악",
  "서초", "강남", "송파", "강동", "성동", "광진", "용산", "종로",
];

/**
 * 학교 이름의 "핵심 식별자"를 반환.
 *
 * 처리 순서:
 *  1) 소문자화 + 공백·특수문자 제거
 *  2) 학교 타입 접미사 정규화
 *     초등학교 | 초교 → 초
 *     중학교   | 중교 → 중
 *     고등학교 | 고교 → 고
 *  3) 지역 접두사 제거 (남은 이름이 2글자 이상일 때만)
 *
 * 예) '서울예일고등학교' → '예일고'
 *     '예일고등학교'    → '예일고'   (두 이름이 같은 학교로 판정)
 *     '예일고'          → '예일고'
 *     '서울고등학교'    → '서울고'   (접두사 제거 시 '고' 1글자 → 유지)
 */
export function schoolCoreName(name: string): string {
  let n = name.trim().toLowerCase().replace(/[\s·•\-_()（）]/g, "");

  // 타입 정규화 (긴 표현 먼저)
  n = n
    .replace(/초등학교$/, "초").replace(/초교$/, "초")
    .replace(/중학교$/, "중").replace(/중교$/, "중")
    .replace(/고등학교$/, "고").replace(/고교$/, "고");

  // 지역 접두사 제거 (남은 이름 ≥ 2글자 보장)
  for (const prefix of SCHOOL_NAME_PREFIXES) {
    if (n.startsWith(prefix) && n.length - prefix.length >= 2) {
      n = n.slice(prefix.length);
      break;
    }
  }

  return n;
}

/** 이름 정규화 (소문자 + 공백·특수문자 제거) — 학교·담배샵 공통 */
export function normalizeName(n: string): string {
  return n.trim().toLowerCase().replace(/[\s·•\-_()（）]/g, "");
}

/** 좌표 간 거리 (미터, 평면 근사 — 한반도 범위에서 충분히 정확) */
export function approxMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dlat = (lat2 - lat1) * 111320;
  const dlng = (lng2 - lng1) * 111320 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

/**
 * 학교 중복 여부 판정.
 * ① 핵심 이름 동일 + 좌표 ≤ 300m                      → 중복 (지역접두사·타입표기 차이 무시)
 * ② 정규화 이름 동일 + 타입 동일 + 좌표 ≤ 500m        → 중복
 * ③ 정규화 이름 동일 + 좌표 ≤ 80m                     → 중복 (지오코딩 오차)
 * ④ 좌표 ≤ 30m (이름 무관)                            → 중복 (같은 부지)
 *
 * ※ 규칙 ①②에 좌표 조건 추가: 전국 데이터에서 동명 학교(부산OO초 vs 서울OO초)를
 *   거리 없이 중복 처리하는 오탐을 방지합니다.
 */
export function isSchoolDup(s: School, pool: School[]): boolean {
  const sc = schoolCoreName(s.name);
  const nm = normalizeName(s.name);
  for (const e of pool) {
    const ec = schoolCoreName(e.name);
    const en = normalizeName(e.name);
    const d  = approxMeters(s.lat, s.lng, e.lat, e.lng);
    if (sc === ec && sc.length >= 2 && d <= 300) return true;  // ① 핵심 이름 + 300m
    if (nm === en && s.type === e.type && d <= 500) return true; // ② 정규화 이름 + 타입 + 500m
    if (nm === en && d <= 80)           return true;             // ③ 정규화 이름 + 80m
    if (d <= 30)                        return true;             // ④ 좌표 30m
  }
  return false;
}

/**
 * 담배 업소 중복 여부 판정.
 * ① 정규화 이름 동일 + 주소 동일          → 중복
 * ② 정규화 이름 동일 + 좌표 ≤ 30m        → 중복 (지오코딩 오차 허용)
 * ③ 좌표 ≤ 15m (이름 무관)               → 중복 (같은 장소)
 */
export function isTobaccoDup(s: TobaccoShop, pool: TobaccoShop[]): boolean {
  const nm   = normalizeName(s.name);
  const addr = s.address ? normalizeName(s.address) : null;
  for (const e of pool) {
    const en = normalizeName(e.name);
    const d  = approxMeters(s.lat, s.lng, e.lat, e.lng);
    const ea = e.address ? normalizeName(e.address) : null;
    if (nm === en && addr && ea && addr === ea) return true;
    if (nm === en && d <= 30)                   return true;
    if (d <= 15)                                return true;
  }
  return false;
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getTobaccoZone(shop: TobaccoShop, schools: School[]): TobaccoZone {
  // 부지 경계까지의 거리 = 중심까지 거리 - 부지 반경 (최소 0)
  const minDist = Math.min(...schools.map((s) => {
    const d = haversineDistance(shop.lat, shop.lng, s.lat, s.lng);
    return Math.max(0, d - (s.propertyRadius ?? 0));
  }));
  if (minDist <= 50)  return "50m이내";
  if (minDist <= 200) return "200m이내";
  return "외부";
}


/* ──────────────────────────────────────────────────
   샘플 데이터 없음 — 엑셀 업로드로 직접 등록하세요
   (구 샘플 s1~s104 제거됨)
────────────────────────────────────────────────── */
export const SAMPLE_SCHOOLS: School[] = [];

/* ──────────────────────────────────────────────────
   서울시 무인·유인 전자담배 업소 샘플 데이터
   zone은 런타임에 계산, 여기선 위치만 정의
────────────────────────────────────────────────── */
export const SAMPLE_TOBACCO_SHOPS: TobaccoShop[] = [];
