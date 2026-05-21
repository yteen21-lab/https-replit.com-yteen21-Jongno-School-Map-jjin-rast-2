function EcigSVG({ size = 32, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* 기기 본체 */}
      <rect x="3" y="13" width="18" height="7" rx="3.5" fill={color} opacity="0.95"/>
      {/* 배터리 표시 줄 */}
      <rect x="5" y="15.5" width="5" height="4" rx="1" fill={color} opacity="0.35"/>
      <rect x="11" y="15.5" width="2" height="4" rx="0.8" fill={color} opacity="0.35"/>
      {/* 마우스피스(흡입구) */}
      <rect x="21" y="14.5" width="5" height="4" rx="2" fill={color} opacity="0.7"/>
      {/* 충전 단자 */}
      <rect x="2" y="15.5" width="1.5" height="3" rx="0.5" fill={color} opacity="0.5"/>
      {/* 연기/증기 */}
      <path d="M27.5 12 Q29 10 27.5 8 Q26 6 28 4.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" fill="none"/>
      <path d="M25 11 Q26.5 9 25 7.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" fill="none"/>
      <path d="M29 13 Q30.5 11.5 29 10" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.4" fill="none"/>
    </svg>
  );
}

function PinMarker({ children, bg, border, label, tag, tagBg, tagText }: {
  children: React.ReactNode;
  bg: string; border: string; label: string; tag: string; tagBg: string; tagText: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-col items-center">
        {/* 원형 마커 */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl border-4 border-white"
          style={{ background: bg, outline: `3px solid ${border}` }}
        >
          {children}
        </div>
        {/* 태그 */}
        <div
          className="mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full shadow"
          style={{ background: tagBg, color: tagText }}
        >
          {tag}
        </div>
        {/* 핀 꼬리 */}
        <div className="w-0.5 h-4 mt-0.5" style={{ background: border }} />
        <div className="w-2 h-2 rounded-full" style={{ background: border }} />
      </div>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
    </div>
  );
}

export function VapeIcon() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center gap-12 p-8">
      <div className="text-center">
        <div className="text-lg font-bold text-slate-700">마커 디자인 미리보기</div>
        <div className="text-sm text-slate-400 mt-0.5">무인자판기 SVG 아이콘 · 오프라인 🏬</div>
      </div>

      <div className="flex items-start gap-16">
        {/* 무인자판기 — SVG 전자담배 */}
        <PinMarker
          bg="linear-gradient(135deg,#334155,#0f172a)"
          border="#475569"
          label="무인자판기 매장"
          tag="무인"
          tagBg="#334155"
          tagText="white"
        >
          <EcigSVG size={36} color="#e2e8f0" />
        </PinMarker>

        {/* 유인 오프라인 — 🏬 이모지 */}
        <PinMarker
          bg="linear-gradient(135deg,#7c3aed,#4c1d95)"
          border="#7c3aed"
          label="오프라인 매장"
          tag="유인"
          tagBg="#7c3aed"
          tagText="white"
        >
          <span style={{ fontSize: 32, lineHeight: 1 }}>🏬</span>
        </PinMarker>
      </div>

      {/* 작은 크기 비교 */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-xs text-slate-400 font-medium">축소 크기 (지도 실제 크기 참고)</div>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow"
              style={{ background: "linear-gradient(135deg,#334155,#0f172a)", outline: "2px solid #475569" }}>
              <EcigSVG size={20} color="#e2e8f0" />
            </div>
            <div className="text-[9px] text-slate-500">무인</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4c1d95)", outline: "2px solid #7c3aed" }}>
              <span style={{ fontSize: 18 }}>🏬</span>
            </div>
            <div className="text-[9px] text-slate-500">유인</div>
          </div>
        </div>
      </div>
    </div>
  );
}
