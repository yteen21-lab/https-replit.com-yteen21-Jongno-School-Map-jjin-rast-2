export type SchoolType = "초등학교" | "중학교" | "고등학교" | "기타";

export interface School {
  id: string;
  name: string;
  type: SchoolType;
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

export const SAMPLE_SCHOOLS: School[] = [
  { id: "1", name: "경복초등학교", type: "초등학교", lat: 37.5792, lng: 126.9742 },
  { id: "2", name: "청운초등학교", type: "초등학교", lat: 37.5843, lng: 126.9676 },
  { id: "3", name: "효제초등학교", type: "초등학교", lat: 37.5740, lng: 126.9971 },
  { id: "4", name: "교동초등학교", type: "초등학교", lat: 37.5753, lng: 126.9791 },
  { id: "5", name: "종로중학교", type: "중학교", lat: 37.5698, lng: 126.9849 },
  { id: "6", name: "창덕여자중학교", type: "중학교", lat: 37.5791, lng: 126.9998 },
  { id: "7", name: "대동세무고등학교", type: "고등학교", lat: 37.5668, lng: 126.9762 },
  { id: "8", name: "경복고등학교", type: "고등학교", lat: 37.5807, lng: 126.9721 },
];
