export default function TobaccoIcons() {
  /* 무인: 24H 자판기 — 전자담배 기기가 진열된 자판기 실루엣 */
  const unmanned24Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="16" height="16">
    <!-- 기계 몸통 -->
    <rect x="2" y="1.5" width="14" height="15" rx="1.5" fill="white" fill-opacity="0.15" stroke="white" stroke-width="0.6" stroke-opacity="0.5"/>
    <!-- 상단 디스플레이 -->
    <rect x="3" y="2.5" width="12" height="4.5" rx="0.8" fill="white" fill-opacity="0.3"/>
    <text x="9" y="5.8" text-anchor="middle" font-size="3.8" font-weight="900" fill="white" font-family="Arial,sans-serif" letter-spacing="0.3">24H</text>
    <!-- 진열 유리창 -->
    <rect x="3" y="8" width="12" height="5" rx="0.8" fill="white" fill-opacity="0.18"/>
    <!-- 전자담배 기기 (pod형) 3개 진열 -->
    <rect x="4.5" y="9.2" width="2.5" height="2.5" rx="0.8" fill="white" fill-opacity="0.55"/>
    <rect x="7.8" y="9.2" width="2.5" height="2.5" rx="0.8" fill="white" fill-opacity="0.55"/>
    <rect x="11" y="9.2" width="2.5" height="2.5" rx="0.8" fill="white" fill-opacity="0.55"/>
    <!-- 투입구 -->
    <rect x="5" y="14" width="8" height="1" rx="0.5" fill="white" fill-opacity="0.35"/>
    <!-- 발 -->
    <rect x="4.5" y="15.8" width="2" height="1" rx="0.3" fill="white" fill-opacity="0.3"/>
    <rect x="11.5" y="15.8" width="2" height="1" rx="0.3" fill="white" fill-opacity="0.3"/>
  </svg>`;

  /* 유인: 전자담배 기기 — 포드형 기기 + 수증기 */
  const mannedVapeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="16" height="16">
    <!-- 기기 몸체 (pod mod) -->
    <rect x="1.5" y="7" width="11" height="4.5" rx="2" fill="white" fill-opacity="0.3" stroke="white" stroke-width="0.5" stroke-opacity="0.5"/>
    <!-- LED 표시등 -->
    <circle cx="3.2" cy="9.25" r="1" fill="white" fill-opacity="0.75"/>
    <!-- 포드 카트리지 -->
    <rect x="5.5" y="7.8" width="5.5" height="2.8" rx="1" fill="white" fill-opacity="0.2"/>
    <!-- 마우스피스 (흡입구) -->
    <path d="M12.5 8 L14.5 7.5 L15 9.5 L14.5 11.5 L12.5 10.5 Z" fill="white" fill-opacity="0.4"/>
    <!-- 수증기 연기 -->
    <path d="M16 7 Q17 5.5 16 4" stroke="white" stroke-width="0.9" stroke-opacity="0.55" fill="none" stroke-linecap="round"/>
    <path d="M15 5.5 Q16.5 4 15 2.5" stroke="white" stroke-width="0.7" stroke-opacity="0.4" fill="none" stroke-linecap="round"/>
    <path d="M14 4.5 Q15 3 13.5 1.8" stroke="white" stroke-width="0.6" stroke-opacity="0.28" fill="none" stroke-linecap="round"/>
    <!-- 충전 포트 -->
    <rect x="2.5" y="11.5" width="3" height="0.6" rx="0.3" fill="white" fill-opacity="0.4"/>
  </svg>`;

  const zones = [
    { label: "50m 이내 (위반)", color: "#ef4444" },
    { label: "200m 이내 (경고)", color: "#f97316" },
    { label: "200m 외부 (정상)", color: "#64748b" },
  ];

  const MarkerPreview = ({
    svg, badge, badgeColor, shopName
  }: { svg: string; badge: string; badgeColor: string; shopName: string }) => (
    <div className="flex flex-col gap-3">
      {zones.map((z) => (
        <div key={z.label} className="flex flex-col items-center gap-1">
          <div style={{ position: "relative", width: 38, height: 38 }}>
            <div style={{
              width: 38, height: 38,
              background: z.color,
              border: "3px solid white",
              borderRadius: 9,
              boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }} dangerouslySetInnerHTML={{ __html: svg }} />
            <div style={{
              position: "absolute", top: -8, right: -11,
              background: badgeColor, color: "white",
              fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "1px 4px",
              border: "1.5px solid white", lineHeight: 1.4, fontFamily: "sans-serif",
            }}>{badge}</div>
          </div>
          <div style={{
            background: z.color, color: "white", borderRadius: 4,
            padding: "2px 8px", fontSize: 10, fontWeight: 700,
            boxShadow: "0 1px 4px rgba(0,0,0,0.25)", fontFamily: "sans-serif",
          }}>{shopName}</div>
          <div className="text-xs text-slate-400 text-center">{z.label}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-8 gap-8">
      <div className="text-base font-bold text-slate-700">담배 업소 마커 아이콘 디자인</div>

      <div className="flex gap-12 items-start">
        <div className="flex flex-col items-center gap-3">
          <div className="text-sm font-semibold text-slate-600">무인 자판기</div>
          <div className="text-xs text-slate-400">24시 전자담배 자판기</div>
          <MarkerPreview svg={unmanned24Svg} badge="무인" badgeColor="#475569" shopName="전담스팟 예시" />
        </div>

        <div className="w-px bg-slate-300 self-stretch mt-8" />

        <div className="flex flex-col items-center gap-3">
          <div className="text-sm font-semibold text-slate-600">유인 전자담배</div>
          <div className="text-xs text-slate-400">전자담배 pod 기기 + 수증기</div>
          <MarkerPreview svg={mannedVapeSvg} badge="유인" badgeColor="#7C3AED" shopName="베이프 예시" />
        </div>

        <div className="w-px bg-slate-300 self-stretch mt-8" />

        <div className="flex flex-col items-center gap-3">
          <div className="text-sm font-semibold text-slate-400">현재 (비교)</div>
          <div className="text-xs text-slate-400">기존 이모지</div>
          <div className="flex flex-col gap-3">
            {zones.map((z, i) => (
              <div key={z.label} className="flex flex-col items-center gap-1">
                <div style={{ position: "relative", width: 38, height: 38 }}>
                  <div style={{
                    width: 38, height: 38, background: z.color, border: "3px solid white",
                    borderRadius: 9, boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17
                  }}>{i === 0 ? "🚬" : "🏪"}</div>
                  <div style={{
                    position: "absolute", top: -8, right: -11,
                    background: i === 0 ? "#475569" : "#7C3AED", color: "white",
                    fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "1px 4px",
                    border: "1.5px solid white", lineHeight: 1.4, fontFamily: "sans-serif"
                  }}>{i === 0 ? "무인" : "유인"}</div>
                </div>
                <div style={{
                  background: z.color, color: "white", borderRadius: 4, padding: "2px 8px",
                  fontSize: 10, fontWeight: 700, fontFamily: "sans-serif"
                }}>매장명 예시</div>
                <div className="text-xs text-slate-400 text-center">{z.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-400 text-center">
        각 행: 빨강(50m 위반) · 주황(200m 경고) · 회색(정상)
      </div>
    </div>
  );
}
