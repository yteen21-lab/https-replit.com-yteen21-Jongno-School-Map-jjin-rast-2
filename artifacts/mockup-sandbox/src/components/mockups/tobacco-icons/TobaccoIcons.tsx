export default function TobaccoIcons() {
  const unmanned24Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="15" height="15">
    <rect x="2" y="1" width="12" height="14" rx="1.5" fill="white" fill-opacity="0.25"/>
    <rect x="3" y="2" width="10" height="5" rx="1" fill="white" fill-opacity="0.35"/>
    <text x="8" y="6.2" text-anchor="middle" font-size="3.8" font-weight="900" fill="white" font-family="Arial,sans-serif">24H</text>
    <rect x="4" y="8.5" width="8" height="2" rx="0.8" fill="white" fill-opacity="0.3"/>
    <rect x="5.5" y="11.5" width="2" height="1.8" rx="0.4" fill="white" fill-opacity="0.4"/>
    <rect x="8.5" y="11.5" width="2" height="1.8" rx="0.4" fill="white" fill-opacity="0.4"/>
  </svg>`;

  const mannedVapeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="15" height="15">
    <rect x="1" y="6.5" width="9.5" height="3" rx="1.5" fill="white" fill-opacity="0.35"/>
    <rect x="10.5" y="7" width="1.5" height="2" rx="0.5" fill="white" fill-opacity="0.5"/>
    <rect x="12" y="7.2" width="2.5" height="1.6" rx="0.8" fill="white" fill-opacity="0.25"/>
    <path d="M13 4.5 Q13.5 3.5 13 2.5" stroke="white" stroke-width="0.7" stroke-opacity="0.6" fill="none" stroke-linecap="round"/>
    <path d="M11.5 5 Q12.5 3.5 11.5 2" stroke="white" stroke-width="0.7" stroke-opacity="0.45" fill="none" stroke-linecap="round"/>
    <path d="M10 5.5 Q11 4 10 2.5" stroke="white" stroke-width="0.7" stroke-opacity="0.35" fill="none" stroke-linecap="round"/>
  </svg>`;

  const zones = [
    { label: "50m 이내 (위반)", color: "#ef4444" },
    { label: "200m 이내 (경고)", color: "#f97316" },
    { label: "200m 외부 (정상)", color: "#64748b" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-8 gap-10">
      <div className="text-lg font-bold text-slate-700">담배 업소 마커 아이콘 디자인</div>

      <div className="flex gap-16 items-start">
        {/* 무인 자판기 */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">무인 자판기</div>
          <div className="text-xs text-slate-400 mb-1">24시 전자담배 아이콘</div>
          <div className="flex flex-col gap-3">
            {zones.map((z) => (
              <div key={z.label} className="flex flex-col items-center gap-1">
                <div style={{ position: "relative", width: 36, height: 36 }}>
                  <div style={{
                    width: 36, height: 36,
                    background: z.color,
                    border: "3px solid white",
                    borderRadius: 8,
                    boxShadow: "0 3px 8px rgba(0,0,0,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }} dangerouslySetInnerHTML={{ __html: unmanned24Svg }} />
                  <div style={{
                    position: "absolute", top: -7, right: -10,
                    background: "#475569", color: "white",
                    fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "1px 4px",
                    border: "1.5px solid white", lineHeight: 1.3, fontFamily: "sans-serif",
                  }}>무인</div>
                </div>
                <div style={{
                  background: z.color, color: "white", borderRadius: 4,
                  padding: "2px 7px", fontSize: 10, fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.25)", fontFamily: "sans-serif",
                }}>전담스팟 예시</div>
                <div className="text-xs text-slate-400">{z.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div className="w-px bg-slate-300 self-stretch mt-10" />

        {/* 유인 전자담배 */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">유인 전자담배</div>
          <div className="text-xs text-slate-400 mb-1">전자담배 매장 아이콘</div>
          <div className="flex flex-col gap-3">
            {zones.map((z) => (
              <div key={z.label} className="flex flex-col items-center gap-1">
                <div style={{ position: "relative", width: 36, height: 36 }}>
                  <div style={{
                    width: 36, height: 36,
                    background: z.color,
                    border: "3px solid white",
                    borderRadius: 8,
                    boxShadow: "0 3px 8px rgba(0,0,0,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }} dangerouslySetInnerHTML={{ __html: mannedVapeSvg }} />
                  <div style={{
                    position: "absolute", top: -7, right: -10,
                    background: "#7C3AED", color: "white",
                    fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "1px 4px",
                    border: "1.5px solid white", lineHeight: 1.3, fontFamily: "sans-serif",
                  }}>유인</div>
                </div>
                <div style={{
                  background: z.color, color: "white", borderRadius: 4,
                  padding: "2px 7px", fontSize: 10, fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.25)", fontFamily: "sans-serif",
                }}>베이프 예시</div>
                <div className="text-xs text-slate-400">{z.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div className="w-px bg-slate-300 self-stretch mt-10" />

        {/* 기존 아이콘 (비교용) */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">현재 (비교)</div>
          <div className="text-xs text-slate-400 mb-1">기존 이모지 아이콘</div>
          <div className="flex flex-col gap-3">
            {zones.map((z, i) => (
              <div key={z.label} className="flex flex-col items-center gap-1">
                <div style={{ position: "relative", width: 36, height: 36 }}>
                  <div style={{
                    width: 36, height: 36,
                    background: z.color,
                    border: "3px solid white",
                    borderRadius: 8,
                    boxShadow: "0 3px 8px rgba(0,0,0,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, lineHeight: 1,
                  }}>{i === 0 ? "🚬" : "🏪"}</div>
                  <div style={{
                    position: "absolute", top: -7, right: -10,
                    background: i === 0 ? "#475569" : "#7C3AED", color: "white",
                    fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "1px 4px",
                    border: "1.5px solid white", lineHeight: 1.3, fontFamily: "sans-serif",
                  }}>{i === 0 ? "무인" : "유인"}</div>
                </div>
                <div style={{
                  background: z.color, color: "white", borderRadius: 4,
                  padding: "2px 7px", fontSize: 10, fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.25)", fontFamily: "sans-serif",
                }}>매장명 예시</div>
                <div className="text-xs text-slate-400">{z.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-400 text-center mt-2">
        각 행은 위반 구역별 색상 (빨강 · 주황 · 회색) 을 나타냅니다
      </div>
    </div>
  );
}
