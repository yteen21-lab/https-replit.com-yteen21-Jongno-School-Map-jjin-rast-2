export type SchoolType = "초등학교" | "중학교" | "고등학교" | "기타";
export type TobaccoZone = "50m이내" | "200m이내" | "외부";

export interface School {
  id: string;
  name: string;
  type: SchoolType;
  lat: number;
  lng: number;
  district?: string;
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
  const minDist = Math.min(...schools.map((s) => haversineDistance(shop.lat, shop.lng, s.lat, s.lng)));
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
