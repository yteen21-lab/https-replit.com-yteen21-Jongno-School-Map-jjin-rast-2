export function StyleD() {
  const markers = [
    { label: "무인자판기 매장", icon: "☁️", tag: "무인", tagBg: "#334155", tagText: "white", cardBg: "white", border: "#e2e8f0", dot: "#64748b" },
    { label: "유인 오프라인 매장", icon: "🛎️", tag: "유인", tagBg: "#7c3aed", tagText: "white", cardBg: "white", border: "#ddd6fe", dot: "#7c3aed" },
  ];
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center mb-2">
        <div className="text-lg font-bold text-slate-700">스타일 D</div>
        <div className="text-sm text-slate-400">레이블 카드형</div>
      </div>
      {markers.map((m) => (
        <div key={m.label} className="flex flex-col items-center gap-1">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl shadow-md border"
            style={{ background: m.cardBg, borderColor: m.border }}
          >
            <span className="text-xl">{m.icon}</span>
            <div>
              <div className="text-xs font-semibold text-slate-700 leading-tight">{m.label}</div>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: m.tagBg, color: m.tagText }}
              >{m.tag}</span>
            </div>
          </div>
          <div className="w-0.5 h-3" style={{ background: m.dot }} />
          <div className="w-2 h-2 rounded-full" style={{ background: m.dot }} />
        </div>
      ))}
    </div>
  );
}
