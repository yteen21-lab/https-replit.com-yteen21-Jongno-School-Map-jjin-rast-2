export default function TobaccoIcons() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-10 gap-12">
      <div className="text-lg font-bold text-slate-700">담배 업소 마커 아이콘 (확대)</div>

      <div className="flex gap-20 items-start">

        {/* 무인 자판기 */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm font-semibold text-slate-600">무인 자판기 (24H)</div>
          <div className="bg-red-500 rounded-2xl p-5 shadow-xl" style={{ width: 100, height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="80" height="80">
              {/* 기계 외곽 */}
              <rect x="4" y="2" width="32" height="36" rx="3" fill="white" fillOpacity="0.18" stroke="white" strokeWidth="1.2" strokeOpacity="0.6"/>
              {/* 상단 디스플레이 패널 */}
              <rect x="6" y="4" width="28" height="10" rx="2" fill="white" fillOpacity="0.32"/>
              <text x="20" y="11.5" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="white" fontFamily="Arial,sans-serif" letterSpacing="0.5">24H</text>
              {/* 진열 유리창 테두리 */}
              <rect x="6" y="16" width="28" height="14" rx="2" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="0.8" strokeOpacity="0.4"/>
              {/* 전자담배 기기 3개 진열 */}
              <rect x="8.5" y="18" width="6" height="9" rx="2" fill="white" fillOpacity="0.55"/>
              <rect x="17" y="18" width="6" height="9" rx="2" fill="white" fillOpacity="0.55"/>
              <rect x="25.5" y="18" width="6" height="9" rx="2" fill="white" fillOpacity="0.55"/>
              {/* 진열 기기 위 수증기 표시 */}
              <circle cx="11.5" cy="21" r="1.2" fill="white" fillOpacity="0.75"/>
              <circle cx="20" cy="21" r="1.2" fill="white" fillOpacity="0.75"/>
              <circle cx="28.5" cy="21" r="1.2" fill="white" fillOpacity="0.75"/>
              {/* 동전 투입구 */}
              <rect x="10" y="32" width="20" height="2.5" rx="1.2" fill="white" fillOpacity="0.4"/>
              {/* 발 받침 */}
              <rect x="9" y="36.5" width="5" height="2.5" rx="1" fill="white" fillOpacity="0.35"/>
              <rect x="26" y="36.5" width="5" height="2.5" rx="1" fill="white" fillOpacity="0.35"/>
            </svg>
          </div>
          <div className="text-xs text-slate-500 text-center max-w-24">자판기 몸통·유리창·전자담배 기기 3개</div>
        </div>

        {/* 유인 전자담배 */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm font-semibold text-slate-600">유인 전자담배 매장</div>
          <div className="bg-red-500 rounded-2xl p-5 shadow-xl" style={{ width: 100, height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="80" height="80">
              {/* 기기 본체 (Pod Mod) */}
              <rect x="3" y="16" width="26" height="10" rx="4" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="1" strokeOpacity="0.5"/>
              {/* LED 표시등 */}
              <circle cx="7" cy="21" r="2.2" fill="white" fillOpacity="0.85"/>
              {/* 포드 카트리지 */}
              <rect x="12" y="18" width="13" height="6" rx="2" fill="white" fillOpacity="0.22"/>
              {/* 마우스피스 (흡입구) - 가늘게 좁아지는 형태 */}
              <path d="M29 17 L34 18.5 L34.5 21 L34 23.5 L29 25 Z" fill="white" fillOpacity="0.45"/>
              {/* 수증기 — 마우스피스 오른쪽 위로 */}
              <path d="M36 16 Q38 13 36 10" stroke="white" strokeWidth="1.8" strokeOpacity="0.65" fill="none" strokeLinecap="round"/>
              <path d="M34 13 Q37 10 34 7" stroke="white" strokeWidth="1.4" strokeOpacity="0.48" fill="none" strokeLinecap="round"/>
              <path d="M32 11 Q35 8 32 5" stroke="white" strokeWidth="1.1" strokeOpacity="0.32" fill="none" strokeLinecap="round"/>
              {/* 충전 포트 */}
              <rect x="5" y="26.5" width="8" height="1.5" rx="0.8" fill="white" fillOpacity="0.45"/>
            </svg>
          </div>
          <div className="text-xs text-slate-500 text-center max-w-24">Pod 기기 본체·LED·마우스피스·수증기 3줄기</div>
        </div>

        {/* 기존 비교 */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm font-semibold text-slate-400">현재 (비교)</div>
          <div className="flex flex-col gap-3 items-center">
            <div>
              <div className="bg-red-500 rounded-2xl shadow-xl flex items-center justify-center" style={{ width: 100, height: 100, fontSize: 52 }}>🚬</div>
              <div className="text-xs text-slate-400 text-center mt-1">무인 기존</div>
            </div>
            <div>
              <div className="bg-red-500 rounded-2xl shadow-xl flex items-center justify-center" style={{ width: 100, height: 100, fontSize: 52 }}>🏪</div>
              <div className="text-xs text-slate-400 text-center mt-1">유인 기존</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
