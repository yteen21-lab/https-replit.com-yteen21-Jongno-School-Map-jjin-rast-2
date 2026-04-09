export type SchoolType = "초등학교" | "중학교" | "고등학교" | "기타";
export type TobaccoZone = "50m이내" | "200m이내" | "외부";

export interface School {
  id: string;
  name: string;
  type: SchoolType;
  lat: number;
  lng: number;
  address?: string;
}

export interface TobaccoShop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

export interface CircleConfig {
  radius: number;
  color: string;
  fillColor: string;
  label: string;
}

export const SCHOOL_TYPE_COLORS: Record<SchoolType, string> = {
  초등학교: "#2563EB",
  중학교: "#16A34A",
  고등학교: "#DC2626",
  기타: "#7C3AED",
};

export const TOBACCO_ZONE_COLORS: Record<TobaccoZone, string> = {
  "50m이내":  "#DC2626",
  "200m이내": "#F97316",
  "외부":     "#64748B",
};

export const CIRCLE_CONFIGS: CircleConfig[] = [
  {
    radius: 50,
    color: "#EF4444",
    fillColor: "#FEE2E2",
    label: "반경 50m",
  },
  {
    radius: 200,
    color: "#3B82F6",
    fillColor: "#DBEAFE",
    label: "반경 200m",
  },
];

/** Haversine 거리 계산 (단위: m) */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 담배샵이 학교들과의 최소 거리로 구역 판별 */
export function getTobaccoZone(shop: TobaccoShop, schools: School[]): TobaccoZone {
  const minDist = Math.min(...schools.map((s) => haversineDistance(shop.lat, shop.lng, s.lat, s.lng)));
  if (minDist <= 50) return "50m이내";
  if (minDist <= 200) return "200m이내";
  return "외부";
}

export const SAMPLE_SCHOOLS: School[] = [
  { id: "1", name: "경복초등학교",     type: "초등학교", lat: 37.5792, lng: 126.9742 },
  { id: "2", name: "청운초등학교",     type: "초등학교", lat: 37.5843, lng: 126.9676 },
  { id: "3", name: "효제초등학교",     type: "초등학교", lat: 37.5740, lng: 126.9971 },
  { id: "4", name: "교동초등학교",     type: "초등학교", lat: 37.5753, lng: 126.9791 },
  { id: "5", name: "종로중학교",       type: "중학교",   lat: 37.5698, lng: 126.9849 },
  { id: "6", name: "창덕여자중학교",   type: "중학교",   lat: 37.5791, lng: 126.9998 },
  { id: "7", name: "대동세무고등학교", type: "고등학교", lat: 37.5668, lng: 126.9762 },
  { id: "8", name: "경복고등학교",     type: "고등학교", lat: 37.5807, lng: 126.9721 },
];

export const SAMPLE_TOBACCO_SHOPS: TobaccoShop[] = [
  { id: "t1", name: "무인담배 종로1가점",   lat: 37.5755, lng: 126.9793, address: "종로구 종로1가" },
  { id: "t2", name: "무인담배 삼청동점",    lat: 37.5790, lng: 126.9745, address: "종로구 삼청동" },
  { id: "t3", name: "무인담배 종로3가점",   lat: 37.5700, lng: 126.9853, address: "종로구 종로3가" },
  { id: "t4", name: "무인담배 효자동점",    lat: 37.5820, lng: 126.9730, address: "종로구 효자동" },
  { id: "t5", name: "무인담배 청운동점",    lat: 37.5855, lng: 126.9688, address: "종로구 청운동" },
  { id: "t6", name: "무인담배 창덕궁점",   lat: 37.5798, lng: 126.9982, address: "종로구 와룡동" },
  { id: "t7", name: "무인담배 이화동점",    lat: 37.5748, lng: 126.9988, address: "종로구 이화동" },
  { id: "t8", name: "무인담배 안국역점",    lat: 37.5769, lng: 126.9858, address: "종로구 안국동" },
  { id: "t9", name: "무인담배 광화문점",    lat: 37.5735, lng: 126.9770, address: "종로구 세종로" },
  { id: "t10", name: "무인담배 혜화동점",  lat: 37.5820, lng: 126.9960, address: "종로구 혜화동" },
];
