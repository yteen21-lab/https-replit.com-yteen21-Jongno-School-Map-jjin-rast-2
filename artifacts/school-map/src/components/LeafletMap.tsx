import { useEffect, useRef, useCallback, type MutableRefObject } from "react";
import {
  School, TobaccoShop, SchoolType,
  SCHOOL_TYPE_COLORS, CIRCLE_CONFIGS,
  TOBACCO_ZONE_COLORS, getTobaccoZone,
} from "@/types/school";

interface LeafletMapProps {
  schools: School[];
  tobaccoShops: TobaccoShop[];
  selectedSchool: School | null;
  selectedTobaccoShop: TobaccoShop | null;
  onSelectSchool: (school: School | null) => void;
  showRadius50: boolean;
  showRadius200: boolean;
  showTobacco: boolean;
  districtPolygon?: [number, number][];
  addSchoolMode?: boolean;
  onAddSchoolFromMap?: (school: Omit<School, "id">) => void;
}

const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 };
const SEOUL_LEVEL = 8;
const CLUSTER_THRESHOLD_M = 100;
const SCHOOL_TYPE_PRIORITY = ["초등학교", "중학교", "고등학교", "기타"];

type KakaoLayer = kakao.maps.CustomOverlay | kakao.maps.Circle | kakao.maps.Polygon | kakao.maps.Marker;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function groupNearbySchools(schools: School[], threshold = CLUSTER_THRESHOLD_M): School[][] {
  const n = schools.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (haversineMeters(schools[i].lat, schools[i].lng, schools[j].lat, schools[j].lng) <= threshold) {
        const pi = find(i), pj = find(j);
        if (pi !== pj) parent[pi] = pj;
      }
    }
  }
  const map = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!map.has(root)) map.set(root, []);
    map.get(root)!.push(i);
  }
  return Array.from(map.values()).map(idx => idx.map(i => schools[i]));
}

/* ── 카카오 Places 카테고리에서 학교 구분 감지 ── */
function detectTypeFromCategory(categoryName: string, placeName: string): SchoolType {
  const cat = categoryName + " " + placeName;
  if (cat.includes("초등학교") || /초$/.test(placeName) || cat.includes("초교")) return "초등학교";
  if (cat.includes("중학교") || /중$/.test(placeName)) return "중학교";
  if (cat.includes("고등학교") || /고$/.test(placeName) || cat.includes("고교")) return "고등학교";
  return "기타";
}

type SearchDoc = {
  id: string; place_name: string; category_name: string;
  address_name: string; road_address_name: string;
  x: string; y: string; distance: string;
};

function renderPickerResults(
  picker: HTMLElement,
  results: SearchDoc[],
  closePicker: () => void,
  onAddSchoolRef: MutableRefObject<((s: Omit<School, "id">) => void) | undefined>,
  existingNames: Set<string>,
) {
  if (results.length === 0) {
    picker.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:13px;font-weight:700;color:#1e293b;">검색 결과 없음</span>
        <button id="picker-close" style="background:none;border:none;cursor:pointer;font-size:18px;color:#94a3b8;">✕</button>
      </div>
      <p style="font-size:12px;color:#64748b;margin:0;">이 위치 150m 이내에 학교가 없습니다.<br>학교 아이콘 위를 직접 클릭해 보세요.</p>`;
    picker.querySelector("#picker-close")?.addEventListener("click", closePicker);
    return;
  }

  const itemsHtml = results.map((r, i) => {
    const type = detectTypeFromCategory(r.category_name, r.place_name);
    const color = SCHOOL_TYPE_COLORS[type];
    const addr = r.road_address_name || r.address_name;
    const dist = r.distance ? `${r.distance}m` : "";
    const added = existingNames.has(r.place_name.trim());
    const badge = type.replace("학교", "").replace("등", "");
    return `
      <div data-idx="${i}" style="
        display:flex;align-items:center;gap:10px;padding:9px 0;
        border-bottom:1px solid #f1f5f9;
        opacity:${added ? 0.5 : 1};pointer-events:${added ? "none" : "auto"};
      ">
        <div style="
          flex-shrink:0;width:36px;height:36px;border-radius:8px;
          background:${color}1a;border:1.5px solid ${color};
          display:flex;align-items:center;justify-content:center;
          font-size:10px;font-weight:700;color:${color};
        ">${badge}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.place_name}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${addr}${dist ? ` · ${dist}` : ""}</div>
        </div>
        ${added
          ? `<span style="font-size:10px;color:#16a34a;font-weight:700;flex-shrink:0;">✓추가됨</span>`
          : `<button data-add="${i}" style="
              flex-shrink:0;background:#2563eb;color:white;border:none;
              border-radius:6px;padding:5px 11px;font-size:11px;font-weight:700;
              cursor:pointer;font-family:inherit;white-space:nowrap;
            ">+ 추가</button>`
        }
      </div>`;
  }).join("");

  picker.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <span style="font-size:13px;font-weight:700;color:#1e293b;">📍 인근 학교 (${results.length}개)</span>
      <button id="picker-close" style="background:none;border:none;cursor:pointer;font-size:18px;color:#94a3b8;line-height:1;padding:0 2px;">✕</button>
    </div>
    <div style="max-height:320px;overflow-y:auto;">${itemsHtml}</div>`;

  picker.querySelector("#picker-close")?.addEventListener("click", closePicker);

  picker.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt((btn as HTMLElement).getAttribute("data-add") || "0");
      const r = results[idx];
      const type = detectTypeFromCategory(r.category_name, r.place_name);
      const lat = parseFloat(r.y), lng = parseFloat(r.x);
      const addr = r.road_address_name || r.address_name;
      const districtMatch = addr.match(/([가-힣]+구)/);
      onAddSchoolRef.current?.({ name: r.place_name, type, lat, lng, district: districtMatch?.[1] });
      /* 버튼 → "추가됨" 교체 */
      const row = picker.querySelector(`[data-idx="${idx}"]`);
      if (row) {
        (row as HTMLElement).style.opacity = "0.5";
        (row as HTMLElement).style.pointerEvents = "none";
        const addBtn = row.querySelector("[data-add]");
        if (addBtn) {
          const span = document.createElement("span");
          span.style.cssText = "font-size:10px;color:#16a34a;font-weight:700;flex-shrink:0;";
          span.textContent = "✓추가됨";
          addBtn.replaceWith(span);
        }
      }
    });
  });
}

/* ── 서버 사이드 폴백 학교 검색 ── */
function doServerSearch(
  lat: number,
  lng: number,
  picker: HTMLElement,
  closePicker: () => void,
  onAddSchoolRef: MutableRefObject<((s: Omit<School, "id">) => void) | undefined>,
  schoolsRef: MutableRefObject<School[]>,
) {
  fetch(`/api/kakao-school-search?lat=${lat}&lng=${lng}&radius=150`)
    .then(async (r) => {
      if (r.status === 401 || r.status === 403) {
        /* API 키 도메인 미등록: 직접 입력 폼으로 전환 */
        renderManualForm(lat, lng, picker, closePicker, onAddSchoolRef);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<{ documents: SearchDoc[] }>;
    })
    .then((data) => {
      if (!data) return;
      const existingNames = new Set(schoolsRef.current.map(s => s.name.trim()));
      renderPickerResults(picker, data.documents, closePicker, onAddSchoolRef, existingNames);
    })
    .catch(() => {
      renderManualForm(lat, lng, picker, closePicker, onAddSchoolRef);
    });
}

/* ── 수동 입력 폼 (검색 API 실패 폴백) ── */
function renderManualForm(
  lat: number,
  lng: number,
  picker: HTMLElement,
  closePicker: () => void,
  onAddSchoolRef: MutableRefObject<((s: Omit<School, "id">) => void) | undefined>,
) {
  const typeOptions = ["초등학교", "중학교", "고등학교", "기타"]
    .map(t => `<option value="${t}">${t}</option>`).join("");
  picker.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <span style="font-size:13px;font-weight:700;color:#1e293b;">📍 학교 직접 추가</span>
      <button id="picker-close" style="background:none;border:none;cursor:pointer;font-size:18px;color:#94a3b8;">✕</button>
    </div>
    <div style="font-size:11px;color:#94a3b8;margin-bottom:10px;">위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}</div>
    <label style="font-size:12px;color:#475569;font-weight:600;">학교명</label>
    <input id="manual-name" type="text" placeholder="예: 종로초등학교" style="
      display:block;width:100%;box-sizing:border-box;margin:4px 0 10px;
      border:1.5px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:13px;
      font-family:'Noto Sans KR',sans-serif;outline:none;
    " />
    <label style="font-size:12px;color:#475569;font-weight:600;">학교 구분</label>
    <select id="manual-type" style="
      display:block;width:100%;box-sizing:border-box;margin:4px 0 14px;
      border:1.5px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:13px;
      font-family:'Noto Sans KR',sans-serif;background:white;
    ">${typeOptions}</select>
    <button id="manual-add" style="
      width:100%;background:#2563eb;color:white;border:none;
      border-radius:8px;padding:10px;font-size:13px;font-weight:700;
      cursor:pointer;font-family:'Noto Sans KR',sans-serif;
    ">추가하기</button>`;
  picker.querySelector("#picker-close")?.addEventListener("click", closePicker);
  picker.querySelector("#manual-add")?.addEventListener("click", () => {
    const name = (picker.querySelector("#manual-name") as HTMLInputElement)?.value.trim();
    const type = (picker.querySelector("#manual-type") as HTMLSelectElement)?.value as School["type"];
    if (!name) { (picker.querySelector("#manual-name") as HTMLInputElement).style.borderColor = "#ef4444"; return; }
    onAddSchoolRef.current?.({ name, type, lat, lng });
    closePicker();
  });
  const nameInput = picker.querySelector("#manual-name") as HTMLInputElement;
  if (nameInput) nameInput.focus();
}

let kakaoLoaded = false;
let kakaoLoadCallbacks: (() => void)[] = [];

function loadKakao(callback: () => void) {
  if (kakaoLoaded) { callback(); return; }
  kakaoLoadCallbacks.push(callback);
  if (kakaoLoadCallbacks.length > 1) return;

  const w = window as any;

  const runLoad = () => {
    w.kakao.maps.load(() => {
      kakaoLoaded = true;
      kakaoLoadCallbacks.forEach((cb) => cb());
      kakaoLoadCallbacks = [];
    });
  };

  if (w.kakao) {
    runLoad();
  } else {
    // 스크립트가 아직 파싱 중이면 잠시 대기
    const timer = setInterval(() => {
      if (w.kakao) {
        clearInterval(timer);
        runLoad();
      }
    }, 50);
  }
}

export default function LeafletMap({
  schools,
  tobaccoShops,
  selectedSchool,
  selectedTobaccoShop,
  onSelectSchool,
  showRadius50,
  showRadius200,
  showTobacco,
  districtPolygon,
  addSchoolMode = false,
  onAddSchoolFromMap,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const schoolLayersRef = useRef<KakaoLayer[]>([]);
  const tobaccoLayersRef = useRef<KakaoLayer[]>([]);
  const districtLayerRef = useRef<kakao.maps.Polygon | null>(null);
  const openPopupRef = useRef<HTMLElement | null>(null);
  const pickerRef = useRef<HTMLElement | null>(null);
  const addSchoolModeRef = useRef(addSchoolMode);
  const onAddSchoolRef = useRef(onAddSchoolFromMap);
  const schoolsRef = useRef(schools);

  const clearSchoolLayers = useCallback(() => {
    schoolLayersRef.current.forEach((l) => l.setMap(null));
    schoolLayersRef.current = [];
  }, []);

  const clearTobaccoLayers = useCallback(() => {
    tobaccoLayersRef.current.forEach((l) => l.setMap(null));
    tobaccoLayersRef.current = [];
    if (openPopupRef.current) {
      openPopupRef.current.remove();
      openPopupRef.current = null;
    }
  }, []);

  const closePicker = useCallback(() => {
    if (pickerRef.current) { pickerRef.current.remove(); pickerRef.current = null; }
  }, []);

  /* ref 동기화 */
  useEffect(() => { addSchoolModeRef.current = addSchoolMode; }, [addSchoolMode]);
  useEffect(() => { onAddSchoolRef.current = onAddSchoolFromMap; }, [onAddSchoolFromMap]);
  useEffect(() => { schoolsRef.current = schools; }, [schools]);

  /* addSchoolMode 변경 시 커서 스타일 변경 */
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.cursor = addSchoolMode ? "crosshair" : "";
    }
    if (!addSchoolMode) closePicker();
  }, [addSchoolMode, closePicker]);

  /* ── 지도 초기화 ── */
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    loadKakao(() => {
      if (destroyed || !containerRef.current) return;

      const map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng),
        level: SEOUL_LEVEL,
      });

      kakao.maps.event.addListener(map, "click", (mouseEvent: any) => {
        /* 일반 모드: 선택 해제 + 팝업 닫기 */
        if (!addSchoolModeRef.current) {
          onSelectSchool(null);
          if (openPopupRef.current) { openPopupRef.current.remove(); openPopupRef.current = null; }
          return;
        }

        /* 학교 추가 모드: 클릭 위치 기준 학교 검색 */
        closePicker();
        const latlng: kakao.maps.LatLng = mouseEvent.latLng;
        const lat = latlng.getLat();
        const lng = latlng.getLng();

        /* 피커를 body에 fixed 위치로 추가 (z-index 문제 완전 회피) */
        const picker = document.createElement("div");
        picker.style.cssText = [
          "position:fixed", "top:50%", "left:50%",
          "transform:translate(-50%,-50%)",
          "background:white", "border-radius:14px", "padding:18px 20px",
          "min-width:280px", "max-width:360px", "width:90vw",
          "box-shadow:0 12px 40px rgba(0,0,0,0.25)", "z-index:999999",
          "font-family:'Noto Sans KR',sans-serif",
        ].join(";");
        picker.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:13px;font-weight:700;color:#1e293b;">📍 인근 학교 검색 중...</span>
            <button id="picker-close" style="background:none;border:none;cursor:pointer;font-size:18px;color:#94a3b8;line-height:1;padding:0 2px;">✕</button>
          </div>
          <div style="height:3px;background:#e2e8f0;border-radius:2px;overflow:hidden;">
            <div style="height:3px;background:#2563eb;border-radius:2px;animation:pickerLoad 1.5s ease-in-out infinite;width:40%;"></div>
          </div>`;
        /* 로딩 애니메이션 스타일 주입 */
        if (!document.getElementById("picker-anim-style")) {
          const s = document.createElement("style");
          s.id = "picker-anim-style";
          s.textContent = `@keyframes pickerLoad{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}`;
          document.head.appendChild(s);
        }
        picker.querySelector("#picker-close")?.addEventListener("click", () => closePicker());
        document.body.appendChild(picker);
        pickerRef.current = picker;

        /* 1차: 클라이언트 사이드 kakao.maps.services.Places 시도 */
        const w = window as any;
        if (w.kakao?.maps?.services?.Places) {
          try {
            const ps = new kakao.maps.services.Places();
            ps.categorySearch("SC4", (results, status) => {
              if (!pickerRef.current || pickerRef.current !== picker) return;
              if (status === "OK" && results.length > 0) {
                const existingNames = new Set(schoolsRef.current.map((s) => s.name.trim()));
                renderPickerResults(picker, results as SearchDoc[], closePicker, onAddSchoolRef, existingNames);
              } else {
                /* 결과 없음 또는 오류 → 서버 폴백 */
                doServerSearch(lat, lng, picker, closePicker, onAddSchoolRef, schoolsRef);
              }
            }, {
              location: latlng,
              radius: 150,
              sort: "distance" as any,
              size: 8,
            });
          } catch {
            /* Places API 사용 불가 → 서버 폴백 */
            doServerSearch(lat, lng, picker, closePicker, onAddSchoolRef, schoolsRef);
          }
        } else {
          /* services 라이브러리 없음 → 서버 폴백 */
          doServerSearch(lat, lng, picker, closePicker, onAddSchoolRef, schoolsRef);
        }
      });

      mapRef.current = map;
    });

    return () => {
      destroyed = true;
      clearSchoolLayers();
      clearTobaccoLayers();
      closePicker();
      if (districtLayerRef.current) districtLayerRef.current.setMap(null);
      mapRef.current = null;
    };
  }, []);

  /* ── 학교 마커 & 반경 원 (클러스터링) ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !kakaoLoaded) return;
    clearSchoolLayers();

    const groups = groupNearbySchools(schools);

    groups.forEach((group) => {
      const isCluster = group.length > 1;

      /* ── 클러스터 중심 (보호구역 원 기준) ── */
      const centLat = group.reduce((s, sc) => s + sc.lat, 0) / group.length;
      const centLng = group.reduce((s, sc) => s + sc.lng, 0) / group.length;
      const centPos = new kakao.maps.LatLng(centLat, centLng);

      /* 중심에서 가장 먼 학교까지 거리 + 부지 반경 → 원 반경 산출 */
      const maxReach = isCluster
        ? Math.max(...group.map(sc =>
            haversineMeters(sc.lat, sc.lng, centLat, centLng) + (sc.propertyRadius ?? 0)
          ))
        : (group[0].propertyRadius ?? 0);

      /* ── 보호구역 원: 클러스터 중심에 단일 원으로 표시 ── */
      CIRCLE_CONFIGS.forEach((cfg) => {
        const shouldShow =
          (cfg.radius === 50 && showRadius50) ||
          (cfg.radius === 200 && showRadius200);
        if (!shouldShow) return;

        const circleRadius = Math.ceil(maxReach) + cfg.radius;
        const circle = new kakao.maps.Circle({
          center: centPos,
          radius: circleRadius,
          map,
          strokeWeight: cfg.radius === 50 ? 3 : 2,
          strokeColor: cfg.color,
          strokeOpacity: 1,
          fillColor: cfg.fillColor,
          fillOpacity: cfg.radius === 50 ? 0.55 : 0.45,
        });
        schoolLayersRef.current.push(circle);
      });

      /* ── 학교 마커 오버레이 ──────────────────────────────────────────
       * ▸ 단일 학교 → 개별 오버레이 (실제 좌표)
       * ▸ 클러스터  → 하나의 오버레이 (중심 좌표) 안에 전체 라벨 목록.
       *   이렇게 해야 같은 위치에 오버레이가 겹쳐 클릭이 빗나가는 문제가 없다.
       * ──────────────────────────────────────────────────────────── */
      const hasSelectedInGroup = group.some(sc => sc.id === selectedSchool?.id);

      if (!isCluster) {
        /* 단일 학교 */
        const sc = group[0];
        const isSel = sc.id === selectedSchool?.id;
        const color = SCHOOL_TYPE_COLORS[sc.type];
        const dotSize = isSel ? 20 : 13;

        const el = document.createElement("div");
        el.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;pointer-events:auto;";
        el.innerHTML = `
          <div style="
            background:white;border:1.5px solid ${color};border-radius:4px;
            padding:2px 7px;font-size:11px;font-family:'Noto Sans KR',sans-serif;
            font-weight:${isSel ? 700 : 500};color:#1e293b;white-space:nowrap;
            box-shadow:0 1px 4px rgba(0,0,0,0.15);
            ${isSel ? `outline:2px solid ${color};` : ""}
          " data-school-id="${sc.id}">${sc.name}</div>
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <div style="
              width:${dotSize}px;height:${dotSize}px;
              background:${color};border:${isSel ? 3 : 2}px solid white;border-radius:50%;
              box-shadow:0 2px 6px rgba(0,0,0,0.4);
            "></div>
          </div>`;

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectSchool(sc);
        });

        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(sc.lat, sc.lng),
          content: el,
          map,
          zIndex: isSel ? 10 : 1,
          xAnchor: 0.5,
          yAnchor: 1,
        });
        schoolLayersRef.current.push(overlay);

      } else {
        /* 클러스터: 하나의 오버레이에 전체 라벨 목록 —————————————————
         * 각 라벨에 data-school-id를 달아 클릭 시 정확한 학교를 선택. */
        const sortedGroup = [...group].sort((a, b) =>
          SCHOOL_TYPE_PRIORITY.indexOf(a.type) - SCHOOL_TYPE_PRIORITY.indexOf(b.type)
        );

        const labelsHtml = sortedGroup.map((sc) => {
          const isSel = sc.id === selectedSchool?.id;
          const color = SCHOOL_TYPE_COLORS[sc.type];
          return `<div
            data-school-id="${sc.id}"
            style="
              display:flex;align-items:center;gap:5px;
              background:${isSel ? color : "white"};
              color:${isSel ? "white" : "#1e293b"};
              border:1.5px solid ${color};border-radius:4px;
              padding:2px 7px;font-size:11px;
              font-family:'Noto Sans KR',sans-serif;
              font-weight:${isSel ? 700 : 500};white-space:nowrap;
              box-shadow:0 1px 4px rgba(0,0,0,0.15);
              cursor:pointer;pointer-events:auto;
            "
          >
            <span style="
              width:7px;height:7px;flex-shrink:0;border-radius:50%;
              background:${isSel ? "white" : color};
            "></span>
            ${sc.name}
          </div>`;
        }).join("");

        const el = document.createElement("div");
        el.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:auto;";
        el.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;">
            ${labelsHtml}
          </div>
          <div style="
            width:13px;height:13px;background:#64748b;
            border:2px solid white;border-radius:50%;
            box-shadow:0 2px 6px rgba(0,0,0,0.4);
            outline:1.5px dashed #94a3b8;outline-offset:2px;
            flex-shrink:0;margin-top:1px;
          "></div>`;

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const target = (e.target as HTMLElement).closest("[data-school-id]");
          if (target) {
            const id = target.getAttribute("data-school-id");
            const found = group.find(s => s.id === id);
            if (found) onSelectSchool(found);
          }
        });

        const overlay = new kakao.maps.CustomOverlay({
          position: centPos,
          content: el,
          map,
          zIndex: hasSelectedInGroup ? 10 : 2,
          xAnchor: 0.5,
          yAnchor: 1,
        });
        schoolLayersRef.current.push(overlay);
      }
    });
  }, [schools, selectedSchool, showRadius50, showRadius200]);

  /* ── 담배 업소 마커 ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !kakaoLoaded) return;
    clearTobaccoLayers();
    if (!showTobacco) return;

    tobaccoShops.forEach((shop) => {
      const zone = getTobaccoZone(shop, schools);
      const color = TOBACCO_ZONE_COLORS[zone];
      const isUnmanned = shop.shopType !== "유인";
      const shopTypeLabel = isUnmanned ? "무인" : "유인";
      const shopTypeColor = isUnmanned ? "#475569" : "#7C3AED";
      const shopEmoji = isUnmanned ? "🚬" : "🏪";
      const shortName = shop.name
        .replace("무인전자담배 ", "")
        .replace("무인담배 ", "")
        .replace("담배샵 ", "");
      const zoneLabel =
        zone === "50m이내"  ? "🔴 학교 50m 이내 (위반)" :
        zone === "200m이내" ? "🟠 학교 200m 이내 (경고)" :
                              "⚫ 학교 200m 외부 (정상)";

      const el = document.createElement("div");
      el.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;";
      el.innerHTML = `
        <div style="position:relative;width:28px;height:28px;">
          <div style="
            width:28px;height:28px;background:${color};border:3px solid white;
            border-radius:6px;box-shadow:0 3px 8px rgba(0,0,0,0.5);
            display:flex;align-items:center;justify-content:center;
            font-size:14px;line-height:1;
          ">${shopEmoji}</div>
          <div style="
            position:absolute;top:-6px;right:-8px;
            background:${shopTypeColor};color:white;
            font-size:8px;font-weight:700;border-radius:3px;padding:1px 3px;
            font-family:'Noto Sans KR',sans-serif;border:1px solid white;line-height:1.2;
          ">${shopTypeLabel}</div>
        </div>
        <div style="
          background:${color};color:white;border-radius:4px;
          padding:2px 6px;font-size:10px;font-family:'Noto Sans KR',sans-serif;
          font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);
          max-width:110px;overflow:hidden;text-overflow:ellipsis;
        ">${shortName}</div>`;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (openPopupRef.current) {
          openPopupRef.current.remove();
          openPopupRef.current = null;
        }

        const popup = document.createElement("div");
        popup.style.cssText = `
          position:absolute;transform:translate(-50%,-110%);
          background:white;border-radius:10px;padding:12px 14px;min-width:180px;
          box-shadow:0 4px 16px rgba(0,0,0,0.18);
          font-family:'Noto Sans KR',sans-serif;
          border-top:4px solid ${color};z-index:100;
        `;
        popup.innerHTML = `
          <button style="position:absolute;top:6px;right:8px;background:none;border:none;cursor:pointer;font-size:14px;color:#94a3b8;">✕</button>
          <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#1e293b;padding-right:20px;">${shop.name}</div>
          <div style="margin-bottom:6px;">
            <span style="display:inline-block;background:${shopTypeColor};color:white;font-size:10px;font-weight:700;border-radius:4px;padding:2px 6px;">
              ${isUnmanned ? "🚬 무인전자담배자판기" : "🏪 오프라인전자담배"}
            </span>
          </div>
          ${shop.address ? `<p style="font-size:11px;color:#64748b;margin:0 0 6px;">${shop.address}</p>` : ""}
          <p style="font-size:12px;font-weight:600;color:${color};margin:0;">${zoneLabel}</p>`;

        popup.querySelector("button")?.addEventListener("click", (ev) => {
          ev.stopPropagation();
          popup.remove();
          openPopupRef.current = null;
        });

        el.style.position = "relative";
        el.appendChild(popup);
        openPopupRef.current = popup;
      });

      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(shop.lat, shop.lng),
        content: el,
        map,
        zIndex: 5,
        xAnchor: 0.5,
        yAnchor: 0.5,
      });

      tobaccoLayersRef.current.push(overlay);
    });
  }, [tobaccoShops, schools, showTobacco]);

  /* ── 구 하이라이트 폴리곤 ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !kakaoLoaded) return;

    if (districtLayerRef.current) {
      districtLayerRef.current.setMap(null);
      districtLayerRef.current = null;
    }

    if (!districtPolygon || districtPolygon.length < 3) return;

    const path = districtPolygon.map(([lat, lng]) => new kakao.maps.LatLng(lat, lng));
    const poly = new kakao.maps.Polygon({
      path,
      map,
      strokeWeight: 2,
      strokeColor: "#2563EB",
      strokeOpacity: 0.7,
      fillColor: "#93C5FD",
      fillOpacity: 0.25,
    });
    districtLayerRef.current = poly;
  }, [districtPolygon]);

  /* ── 선택된 학교로 이동 ── */
  useEffect(() => {
    if (!mapRef.current || !selectedSchool || !kakaoLoaded) return;
    mapRef.current.panTo(new kakao.maps.LatLng(selectedSchool.lat, selectedSchool.lng));
  }, [selectedSchool]);

  /* ── 선택된 담배업소로 이동 ── */
  useEffect(() => {
    if (!mapRef.current || !selectedTobaccoShop || !kakaoLoaded) return;
    mapRef.current.setCenter(new kakao.maps.LatLng(selectedTobaccoShop.lat, selectedTobaccoShop.lng));
    mapRef.current.setLevel(4, { animate: { duration: 400 } });
  }, [selectedTobaccoShop]);

  return (
    <div ref={wrapperRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
