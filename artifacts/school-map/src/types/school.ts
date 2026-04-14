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
   서울시 전체 초·중·고 샘플 데이터 (25개 구)
────────────────────────────────────────────────── */
export const SAMPLE_SCHOOLS: School[] = [
  // 종로구
  { id: "s1",  name: "경복초등학교",     type: "초등학교", lat: 37.5792, lng: 126.9742, district: "종로구" },
  { id: "s2",  name: "청운초등학교",     type: "초등학교", lat: 37.5843, lng: 126.9676, district: "종로구" },
  { id: "s3",  name: "효제초등학교",     type: "초등학교", lat: 37.5740, lng: 126.9971, district: "종로구" },
  { id: "s4",  name: "교동초등학교",     type: "초등학교", lat: 37.5753, lng: 126.9791, district: "종로구" },
  { id: "s5",  name: "종로중학교",       type: "중학교",   lat: 37.5698, lng: 126.9849, district: "종로구" },
  { id: "s6",  name: "창덕여자중학교",   type: "중학교",   lat: 37.5791, lng: 126.9998, district: "종로구" },
  { id: "s7",  name: "경복고등학교",     type: "고등학교", lat: 37.5807, lng: 126.9721, district: "종로구" },
  { id: "s8",  name: "대동세무고등학교", type: "고등학교", lat: 37.5668, lng: 126.9762, district: "종로구" },

  // 중구
  { id: "s9",  name: "소파초등학교",     type: "초등학교", lat: 37.5602, lng: 126.9968, district: "중구" },
  { id: "s10", name: "약현초등학교",     type: "초등학교", lat: 37.5590, lng: 126.9680, district: "중구" },
  { id: "s11", name: "장충중학교",       type: "중학교",   lat: 37.5553, lng: 127.0074, district: "중구" },
  { id: "s12", name: "중앙고등학교",     type: "고등학교", lat: 37.5663, lng: 126.9963, district: "중구" },

  // 용산구
  { id: "s13", name: "용산초등학교",     type: "초등학교", lat: 37.5340, lng: 126.9787, district: "용산구" },
  { id: "s14", name: "이태원초등학교",   type: "초등학교", lat: 37.5346, lng: 126.9945, district: "용산구" },
  { id: "s15", name: "청파중학교",       type: "중학교",   lat: 37.5430, lng: 126.9656, district: "용산구" },
  { id: "s16", name: "용산고등학교",     type: "고등학교", lat: 37.5378, lng: 126.9730, district: "용산구" },

  // 성동구
  { id: "s17", name: "성동초등학교",     type: "초등학교", lat: 37.5631, lng: 127.0430, district: "성동구" },
  { id: "s18", name: "마장초등학교",     type: "초등학교", lat: 37.5633, lng: 127.0475, district: "성동구" },
  { id: "s19", name: "성동중학교",       type: "중학교",   lat: 37.5600, lng: 127.0398, district: "성동구" },
  { id: "s20", name: "성동고등학교",     type: "고등학교", lat: 37.5546, lng: 127.0527, district: "성동구" },

  // 광진구
  { id: "s21", name: "광장초등학교",     type: "초등학교", lat: 37.5450, lng: 127.1028, district: "광진구" },
  { id: "s22", name: "자양초등학교",     type: "초등학교", lat: 37.5380, lng: 127.0813, district: "광진구" },
  { id: "s23", name: "광진중학교",       type: "중학교",   lat: 37.5455, lng: 127.0930, district: "광진구" },
  { id: "s24", name: "광남고등학교",     type: "고등학교", lat: 37.5400, lng: 127.1000, district: "광진구" },

  // 동대문구
  { id: "s25", name: "전농초등학교",     type: "초등학교", lat: 37.5768, lng: 127.0567, district: "동대문구" },
  { id: "s26", name: "신답초등학교",     type: "초등학교", lat: 37.5720, lng: 127.0530, district: "동대문구" },
  { id: "s27", name: "전농중학교",       type: "중학교",   lat: 37.5771, lng: 127.0550, district: "동대문구" },
  { id: "s28", name: "청량고등학교",     type: "고등학교", lat: 37.5800, lng: 127.0611, district: "동대문구" },

  // 중랑구
  { id: "s29", name: "중랑초등학교",     type: "초등학교", lat: 37.6063, lng: 127.0893, district: "중랑구" },
  { id: "s30", name: "신내초등학교",     type: "초등학교", lat: 37.6100, lng: 127.0929, district: "중랑구" },
  { id: "s31", name: "중랑중학교",       type: "중학교",   lat: 37.6050, lng: 127.0870, district: "중랑구" },
  { id: "s32", name: "중랑고등학교",     type: "고등학교", lat: 37.6020, lng: 127.0864, district: "중랑구" },

  // 성북구
  { id: "s33", name: "성북초등학교",     type: "초등학교", lat: 37.5891, lng: 127.0188, district: "성북구" },
  { id: "s34", name: "돈암초등학교",     type: "초등학교", lat: 37.5940, lng: 127.0200, district: "성북구" },
  { id: "s35", name: "성북중학교",       type: "중학교",   lat: 37.5900, lng: 127.0168, district: "성북구" },
  { id: "s36", name: "고려고등학교",     type: "고등학교", lat: 37.5873, lng: 127.0307, district: "성북구" },

  // 강북구
  { id: "s37", name: "강북초등학교",     type: "초등학교", lat: 37.6437, lng: 127.0281, district: "강북구" },
  { id: "s38", name: "삼양초등학교",     type: "초등학교", lat: 37.6380, lng: 127.0176, district: "강북구" },
  { id: "s39", name: "강북중학교",       type: "중학교",   lat: 37.6445, lng: 127.0258, district: "강북구" },
  { id: "s40", name: "강북고등학교",     type: "고등학교", lat: 37.6358, lng: 127.0175, district: "강북구" },

  // 도봉구
  { id: "s41", name: "도봉초등학교",     type: "초등학교", lat: 37.6690, lng: 127.0465, district: "도봉구" },
  { id: "s42", name: "창동초등학교",     type: "초등학교", lat: 37.6526, lng: 127.0474, district: "도봉구" },
  { id: "s43", name: "도봉중학교",       type: "중학교",   lat: 37.6705, lng: 127.0440, district: "도봉구" },
  { id: "s44", name: "창동고등학교",     type: "고등학교", lat: 37.6562, lng: 127.0517, district: "도봉구" },

  // 노원구
  { id: "s45", name: "상계초등학교",     type: "초등학교", lat: 37.6568, lng: 127.0633, district: "노원구" },
  { id: "s46", name: "수락초등학교",     type: "초등학교", lat: 37.6700, lng: 127.0600, district: "노원구" },
  { id: "s47", name: "상계중학교",       type: "중학교",   lat: 37.6550, lng: 127.0650, district: "노원구" },
  { id: "s48", name: "상계고등학교",     type: "고등학교", lat: 37.6558, lng: 127.0590, district: "노원구" },

  // 은평구
  { id: "s49", name: "은평초등학교",     type: "초등학교", lat: 37.6022, lng: 126.9217, district: "은평구" },
  { id: "s50", name: "대조초등학교",     type: "초등학교", lat: 37.6125, lng: 126.9260, district: "은평구" },
  { id: "s51", name: "신사중학교",       type: "중학교",   lat: 37.6030, lng: 126.9284, district: "은평구" },
  { id: "s52", name: "은평고등학교",     type: "고등학교", lat: 37.5975, lng: 126.9198, district: "은평구" },

  // 서대문구
  { id: "s53", name: "북가좌초등학교",   type: "초등학교", lat: 37.5738, lng: 126.9153, district: "서대문구" },
  { id: "s54", name: "홍제초등학교",     type: "초등학교", lat: 37.5795, lng: 126.9346, district: "서대문구" },
  { id: "s55", name: "연희중학교",       type: "중학교",   lat: 37.5695, lng: 126.9295, district: "서대문구" },
  { id: "s56", name: "연서고등학교",     type: "고등학교", lat: 37.5694, lng: 126.9219, district: "서대문구" },

  // 마포구
  { id: "s57", name: "마포초등학교",     type: "초등학교", lat: 37.5547, lng: 126.9230, district: "마포구" },
  { id: "s58", name: "상암초등학교",     type: "초등학교", lat: 37.5773, lng: 126.8893, district: "마포구" },
  { id: "s59", name: "성산중학교",       type: "중학교",   lat: 37.5580, lng: 126.8973, district: "마포구" },
  { id: "s60", name: "마포고등학교",     type: "고등학교", lat: 37.5553, lng: 126.9196, district: "마포구" },

  // 양천구
  { id: "s61", name: "목동초등학교",     type: "초등학교", lat: 37.5243, lng: 126.8750, district: "양천구" },
  { id: "s62", name: "신정초등학교",     type: "초등학교", lat: 37.5196, lng: 126.8641, district: "양천구" },
  { id: "s63", name: "목동중학교",       type: "중학교",   lat: 37.5273, lng: 126.8710, district: "양천구" },
  { id: "s64", name: "양서고등학교",     type: "고등학교", lat: 37.5215, lng: 126.8673, district: "양천구" },

  // 강서구
  { id: "s65", name: "강서초등학교",     type: "초등학교", lat: 37.5545, lng: 126.8391, district: "강서구" },
  { id: "s66", name: "마곡초등학교",     type: "초등학교", lat: 37.5612, lng: 126.8300, district: "강서구" },
  { id: "s67", name: "공항중학교",       type: "중학교",   lat: 37.5601, lng: 126.8100, district: "강서구" },
  { id: "s68", name: "덕원고등학교",     type: "고등학교", lat: 37.5581, lng: 126.8350, district: "강서구" },

  // 구로구
  { id: "s69", name: "구로초등학교",     type: "초등학교", lat: 37.4926, lng: 126.8762, district: "구로구" },
  { id: "s70", name: "오류초등학교",     type: "초등학교", lat: 37.4960, lng: 126.8536, district: "구로구" },
  { id: "s71", name: "구로중학교",       type: "중학교",   lat: 37.4929, lng: 126.8750, district: "구로구" },
  { id: "s72", name: "고려고등학교",     type: "고등학교", lat: 37.4988, lng: 126.8583, district: "구로구" },

  // 금천구
  { id: "s73", name: "금천초등학교",     type: "초등학교", lat: 37.4574, lng: 126.8973, district: "금천구" },
  { id: "s74", name: "시흥초등학교",     type: "초등학교", lat: 37.4491, lng: 126.9018, district: "금천구" },
  { id: "s75", name: "금천중학교",       type: "중학교",   lat: 37.4572, lng: 126.8993, district: "금천구" },
  { id: "s76", name: "금천고등학교",     type: "고등학교", lat: 37.4559, lng: 126.9015, district: "금천구" },

  // 영등포구
  { id: "s77", name: "영등포초등학교",   type: "초등학교", lat: 37.5200, lng: 126.9056, district: "영등포구" },
  { id: "s78", name: "여의도초등학교",   type: "초등학교", lat: 37.5241, lng: 126.9213, district: "영등포구" },
  { id: "s79", name: "영등포중학교",     type: "중학교",   lat: 37.5177, lng: 126.9053, district: "영등포구" },
  { id: "s80", name: "영등포고등학교",   type: "고등학교", lat: 37.5220, lng: 126.9047, district: "영등포구" },

  // 동작구
  { id: "s81", name: "동작초등학교",     type: "초등학교", lat: 37.5032, lng: 126.9540, district: "동작구" },
  { id: "s82", name: "신대방초등학교",   type: "초등학교", lat: 37.5006, lng: 126.9220, district: "동작구" },
  { id: "s83", name: "노량진중학교",     type: "중학교",   lat: 37.5158, lng: 126.9426, district: "동작구" },
  { id: "s84", name: "동작고등학교",     type: "고등학교", lat: 37.5018, lng: 126.9491, district: "동작구" },

  // 관악구
  { id: "s85", name: "관악초등학교",     type: "초등학교", lat: 37.4790, lng: 126.9517, district: "관악구" },
  { id: "s86", name: "봉천초등학교",     type: "초등학교", lat: 37.4760, lng: 126.9472, district: "관악구" },
  { id: "s87", name: "봉천중학교",       type: "중학교",   lat: 37.4800, lng: 126.9460, district: "관악구" },
  { id: "s88", name: "관악고등학교",     type: "고등학교", lat: 37.4766, lng: 126.9525, district: "관악구" },

  // 서초구
  { id: "s89", name: "서초초등학교",     type: "초등학교", lat: 37.4831, lng: 127.0328, district: "서초구" },
  { id: "s90", name: "반포초등학교",     type: "초등학교", lat: 37.5097, lng: 127.0115, district: "서초구" },
  { id: "s91", name: "서초중학교",       type: "중학교",   lat: 37.4839, lng: 127.0234, district: "서초구" },
  { id: "s92", name: "서초고등학교",     type: "고등학교", lat: 37.4800, lng: 127.0330, district: "서초구" },

  // 강남구
  { id: "s93", name: "대치초등학교",     type: "초등학교", lat: 37.4950, lng: 127.0605, district: "강남구" },
  { id: "s94", name: "개포초등학교",     type: "초등학교", lat: 37.4850, lng: 127.0582, district: "강남구" },
  { id: "s95", name: "압구정중학교",     type: "중학교",   lat: 37.5266, lng: 127.0285, district: "강남구" },
  { id: "s96", name: "휘문고등학교",     type: "고등학교", lat: 37.5138, lng: 127.0484, district: "강남구" },

  // 송파구
  { id: "s97", name: "잠실초등학교",     type: "초등학교", lat: 37.5120, lng: 127.0822, district: "송파구" },
  { id: "s98", name: "방이초등학교",     type: "초등학교", lat: 37.5136, lng: 127.1018, district: "송파구" },
  { id: "s99", name: "잠신중학교",       type: "중학교",   lat: 37.5090, lng: 127.0750, district: "송파구" },
  { id: "s100", name: "잠실고등학교",    type: "고등학교", lat: 37.5148, lng: 127.0975, district: "송파구" },

  // 강동구
  { id: "s101", name: "강동초등학교",    type: "초등학교", lat: 37.5497, lng: 127.1477, district: "강동구" },
  { id: "s102", name: "명일초등학교",    type: "초등학교", lat: 37.5508, lng: 127.1345, district: "강동구" },
  { id: "s103", name: "명일중학교",      type: "중학교",   lat: 37.5500, lng: 127.1350, district: "강동구" },
  { id: "s104", name: "강동고등학교",    type: "고등학교", lat: 37.5492, lng: 127.1460, district: "강동구" },
];

/* ──────────────────────────────────────────────────
   서울시 무인·유인 전자담배 업소 샘플 데이터
   (서울 25개 구 전역 분포)
   zone은 런타임에 계산, 여기선 위치만 정의
────────────────────────────────────────────────── */
export const SAMPLE_TOBACCO_SHOPS: TobaccoShop[] = [

  /* ── 종로구 ── */
  { id: "t1",  name: "무인전자담배 광화문점",       lat: 37.5730, lng: 126.9769, address: "종로구 세종로 82",         shopType: "무인" },
  { id: "t2",  name: "인생한모금 종로3가점",        lat: 37.5706, lng: 126.9930, address: "종로구 종로3가 54",        shopType: "무인" },
  { id: "t3",  name: "전자담배 혜화전문점",         lat: 37.5823, lng: 127.0019, address: "종로구 명륜3가 33",        shopType: "유인" },
  { id: "t4",  name: "무인전자담배 효자동점",       lat: 37.5818, lng: 126.9723, address: "종로구 효자동 11",         shopType: "무인" },

  /* ── 중구 ── */
  { id: "t5",  name: "인생한모금 명동점",           lat: 37.5636, lng: 126.9826, address: "중구 명동2가 41",          shopType: "무인" },
  { id: "t6",  name: "전자담배 을지로전문점",       lat: 37.5660, lng: 126.9921, address: "중구 을지로3가 315",       shopType: "유인" },
  { id: "t7",  name: "무인전자담배 시청역점",       lat: 37.5660, lng: 126.9773, address: "중구 태평로1가 31",        shopType: "무인" },

  /* ── 용산구 ── */
  { id: "t8",  name: "무인전자담배 이태원점",       lat: 37.5349, lng: 126.9943, address: "용산구 이태원동 119",      shopType: "무인" },
  { id: "t9",  name: "스모크샵 한남점",             lat: 37.5346, lng: 127.0008, address: "용산구 한남동 683",        shopType: "유인" },
  { id: "t10", name: "무인전자담배 삼각지점",       lat: 37.5375, lng: 126.9700, address: "용산구 한강로3가 40",      shopType: "무인" },

  /* ── 성동구 ── */
  { id: "t11", name: "인생한모금 왕십리점",         lat: 37.5613, lng: 126.9370, address: "성동구 행당동 5",          shopType: "무인" },
  { id: "t12", name: "전자담배 성수전문점",         lat: 37.5445, lng: 127.0558, address: "성동구 성수동1가 670",     shopType: "유인" },
  { id: "t13", name: "무인전자담배 금호점",         lat: 37.5543, lng: 127.0192, address: "성동구 금호동4가 10",      shopType: "무인" },

  /* ── 광진구 ── */
  { id: "t14", name: "무인전자담배 건대입구점",     lat: 37.5402, lng: 127.0697, address: "광진구 화양동 48",         shopType: "무인" },
  { id: "t15", name: "전담전담 건대점",             lat: 37.5398, lng: 127.0726, address: "광진구 자양동 226",        shopType: "유인" },
  { id: "t16", name: "무인전자담배 구의역점",       lat: 37.5476, lng: 127.0952, address: "광진구 구의동 21",         shopType: "무인" },

  /* ── 동대문구 ── */
  { id: "t17", name: "무인전자담배 전농동점",       lat: 37.5775, lng: 127.0558, address: "동대문구 전농동 223",      shopType: "무인" },
  { id: "t18", name: "전자담배 장한평전문점",       lat: 37.5640, lng: 127.0826, address: "동대문구 장안동 460",      shopType: "유인" },
  { id: "t19", name: "인생한모금 신설동점",         lat: 37.5766, lng: 127.0278, address: "동대문구 신설동 97",       shopType: "무인" },

  /* ── 중랑구 ── */
  { id: "t20", name: "무인전자담배 상봉역점",       lat: 37.5957, lng: 127.0861, address: "중랑구 상봉동 37",         shopType: "무인" },
  { id: "t21", name: "무인전자담배 망우역점",       lat: 37.6066, lng: 127.1000, address: "중랑구 망우동 104",        shopType: "무인" },

  /* ── 성북구 ── */
  { id: "t22", name: "인생한모금 길음역점",         lat: 37.6034, lng: 127.0228, address: "성북구 길음동 1310",       shopType: "무인" },
  { id: "t23", name: "전자담배 돌곶이전문점",       lat: 37.6063, lng: 127.0594, address: "성북구 석관동 181",        shopType: "유인" },
  { id: "t24", name: "무인전자담배 석계점",         lat: 37.6147, lng: 127.0668, address: "성북구 석관동 302",        shopType: "무인" },

  /* ── 강북구 ── */
  { id: "t25", name: "무인전자담배 수유역점",       lat: 37.6387, lng: 127.0254, address: "강북구 수유동 170",        shopType: "무인" },
  { id: "t26", name: "전자담배 미아전문점",         lat: 37.6484, lng: 127.0291, address: "강북구 미아동 794",        shopType: "유인" },

  /* ── 도봉구 ── */
  { id: "t27", name: "무인전자담배 창동역점",       lat: 37.6527, lng: 127.0478, address: "도봉구 창동 23",           shopType: "무인" },
  { id: "t28", name: "인생한모금 도봉산점",         lat: 37.6693, lng: 127.0461, address: "도봉구 도봉동 552",        shopType: "무인" },

  /* ── 노원구 ── */
  { id: "t29", name: "무인전자담배 노원역점",       lat: 37.6559, lng: 127.0606, address: "노원구 상계동 714",        shopType: "무인" },
  { id: "t30", name: "무인전자담배 상계역점",       lat: 37.6687, lng: 127.0747, address: "노원구 상계동 1204",       shopType: "무인" },
  { id: "t31", name: "전자담배 중계전문점",         lat: 37.6612, lng: 127.0703, address: "노원구 중계동 391",        shopType: "유인" },

  /* ── 은평구 ── */
  { id: "t32", name: "무인전자담배 연신내점",       lat: 37.6191, lng: 126.9222, address: "은평구 갈현동 396",        shopType: "무인" },
  { id: "t33", name: "전자담배 불광전문점",         lat: 37.6106, lng: 126.9295, address: "은평구 불광동 184",        shopType: "유인" },

  /* ── 서대문구 ── */
  { id: "t34", name: "전담전담 신촌점",             lat: 37.5553, lng: 126.9368, address: "서대문구 창천동 57",       shopType: "유인" },
  { id: "t35", name: "무인전자담배 이대역점",       lat: 37.5566, lng: 126.9463, address: "서대문구 대현동 13",       shopType: "무인" },
  { id: "t36", name: "무인전자담배 홍제역점",       lat: 37.5896, lng: 126.9452, address: "서대문구 홍제동 330",      shopType: "무인" },

  /* ── 마포구 ── */
  { id: "t37", name: "무인전자담배 홍대입구점",     lat: 37.5572, lng: 126.9240, address: "마포구 동교동 165",        shopType: "무인" },
  { id: "t38", name: "인생한모금 합정점",           lat: 37.5493, lng: 126.9138, address: "마포구 합정동 399",        shopType: "무인" },
  { id: "t39", name: "전자담배 마포역전문점",       lat: 37.5549, lng: 126.9235, address: "마포구 도화동 558",        shopType: "유인" },
  { id: "t40", name: "무인전자담배 상암DMC점",      lat: 37.5774, lng: 126.8904, address: "마포구 상암동 1615",       shopType: "무인" },

  /* ── 양천구 ── */
  { id: "t41", name: "무인전자담배 목동역점",       lat: 37.5248, lng: 126.8758, address: "양천구 목동 912",          shopType: "무인" },
  { id: "t42", name: "전자담배 신정전문점",         lat: 37.5198, lng: 126.8648, address: "양천구 신정동 322",        shopType: "유인" },
  { id: "t43", name: "인생한모금 오목교점",         lat: 37.5281, lng: 126.8656, address: "양천구 목동 908",          shopType: "무인" },

  /* ── 강서구 ── */
  { id: "t44", name: "무인전자담배 발산역점",       lat: 37.5589, lng: 126.8389, address: "강서구 우장산동 72",       shopType: "무인" },
  { id: "t45", name: "전담전담 화곡점",             lat: 37.5447, lng: 126.8522, address: "강서구 화곡동 982",        shopType: "유인" },
  { id: "t46", name: "무인전자담배 마곡나루점",     lat: 37.5589, lng: 126.8277, address: "강서구 마곡동 797",        shopType: "무인" },

  /* ── 구로구 ── */
  { id: "t47", name: "무인전자담배 구로디지털점",   lat: 37.4853, lng: 126.9015, address: "구로구 구로동 184",        shopType: "무인" },
  { id: "t48", name: "인생한모금 신도림점",         lat: 37.5083, lng: 126.8912, address: "구로구 신도림동 337",      shopType: "무인" },
  { id: "t49", name: "전자담배 개봉전문점",         lat: 37.4988, lng: 126.8567, address: "구로구 개봉동 76",         shopType: "유인" },

  /* ── 금천구 ── */
  { id: "t50", name: "무인전자담배 가산디지털점",   lat: 37.4773, lng: 126.8852, address: "금천구 가산동 481",        shopType: "무인" },
  { id: "t51", name: "무인전자담배 독산역점",       lat: 37.4739, lng: 126.8928, address: "금천구 독산동 993",        shopType: "무인" },

  /* ── 영등포구 ── */
  { id: "t52", name: "무인전자담배 여의도점",       lat: 37.5216, lng: 126.9240, address: "영등포구 여의도동 36",     shopType: "무인" },
  { id: "t53", name: "전자담배 영등포전문점",       lat: 37.5165, lng: 126.9063, address: "영등포구 영등포동4가 438", shopType: "유인" },
  { id: "t54", name: "인생한모금 신길역점",         lat: 37.5142, lng: 126.9239, address: "영등포구 신길동 336",      shopType: "무인" },

  /* ── 동작구 ── */
  { id: "t55", name: "무인전자담배 사당역점",       lat: 37.4769, lng: 126.9814, address: "동작구 사당동 221",        shopType: "무인" },
  { id: "t56", name: "인생한모금 노량진점",         lat: 37.5143, lng: 126.9426, address: "동작구 노량진동 32",       shopType: "무인" },
  { id: "t57", name: "전자담배 이수전문점",         lat: 37.4870, lng: 126.9811, address: "동작구 사당동 1038",       shopType: "유인" },

  /* ── 관악구 ── */
  { id: "t58", name: "무인전자담배 봉천동점",       lat: 37.4762, lng: 126.9468, address: "관악구 봉천동 1681",       shopType: "무인" },
  { id: "t59", name: "인생한모금 신림역점",         lat: 37.4848, lng: 126.9293, address: "관악구 신림동 536",        shopType: "무인" },
  { id: "t60", name: "전자담배 서울대입구전문점",   lat: 37.4809, lng: 126.9526, address: "관악구 봉천동 862",        shopType: "유인" },

  /* ── 서초구 ── */
  { id: "t61", name: "무인전자담배 교대역점",       lat: 37.4939, lng: 127.0139, address: "서초구 서초동 1330",       shopType: "무인" },
  { id: "t62", name: "전자담배 강남전문점",         lat: 37.5005, lng: 127.0283, address: "서초구 서초동 1321",       shopType: "유인" },
  { id: "t63", name: "무인전자담배 반포점",         lat: 37.5099, lng: 127.0119, address: "서초구 반포동 23",         shopType: "무인" },
  { id: "t64", name: "인생한모금 양재역점",         lat: 37.4849, lng: 127.0344, address: "서초구 양재동 235",        shopType: "무인" },

  /* ── 강남구 ── */
  { id: "t65", name: "무인전자담배 강남역점",       lat: 37.4979, lng: 127.0276, address: "강남구 역삼동 832",        shopType: "무인" },
  { id: "t66", name: "전담전담 선릉점",             lat: 37.5043, lng: 127.0490, address: "강남구 삼성동 157",        shopType: "유인" },
  { id: "t67", name: "무인전자담배 대치동점",       lat: 37.4952, lng: 127.0608, address: "강남구 대치동 947",        shopType: "무인" },
  { id: "t68", name: "전자담배 압구정전문점",       lat: 37.5268, lng: 127.0290, address: "강남구 압구정동 454",      shopType: "유인" },
  { id: "t69", name: "인생한모금 삼성역점",         lat: 37.5088, lng: 127.0632, address: "강남구 삼성동 41",         shopType: "무인" },

  /* ── 송파구 ── */
  { id: "t70", name: "무인전자담배 잠실역점",       lat: 37.5122, lng: 127.0820, address: "송파구 잠실동 186",        shopType: "무인" },
  { id: "t71", name: "전자담배 문정전문점",         lat: 37.4831, lng: 127.1264, address: "송파구 문정동 150",        shopType: "유인" },
  { id: "t72", name: "인생한모금 가락시장점",       lat: 37.4920, lng: 127.1243, address: "송파구 가락동 93",         shopType: "무인" },
  { id: "t73", name: "무인전자담배 석촌호수점",     lat: 37.5087, lng: 127.1007, address: "송파구 석촌동 105",        shopType: "무인" },

  /* ── 강동구 ── */
  { id: "t74", name: "무인전자담배 천호역점",       lat: 37.5392, lng: 127.1237, address: "강동구 천호동 455",        shopType: "무인" },
  { id: "t75", name: "전자담배 강동전문점",         lat: 37.5317, lng: 127.1463, address: "강동구 강동동 29",         shopType: "유인" },
  { id: "t76", name: "인생한모금 명일역점",         lat: 37.5553, lng: 127.1336, address: "강동구 명일동 293",        shopType: "무인" },
  { id: "t77", name: "무인전자담배 길동점",         lat: 37.5397, lng: 127.1354, address: "강동구 길동 440",          shopType: "무인" },
];
