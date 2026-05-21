export function StyleB() {
  const markers = [
    { label: "무인자판기", icon: "⚡", sub: "무인", bg: "#1e293b", text: "#94a3b8", accent: "#38bdf8" },
    { label: "오프라인매장", icon: "🛍️", sub: "유인", bg: "#4c1d95", text: "#c4b5fd", accent: "#a78bfa" },
  ];
  return (
    <div className="min-h-screen bg-slate-200 flex flex-col items-center justify-center gap-10 p-8">
      <div className="text-center mb-2">
        <div className="text-lg font-bold text-slate-700">스타일 B</div>
        <div className="text-sm text-slate-400">다크 원형 뱃지</div>
      </div>
      {markers.map((m) => (
        <div key={m.label} className="flex flex-col items-center gap-2">
          <div
            className="w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-xl border-2"
            style={{ background: m.bg, borderColor: m.accent }}
          >
            <span className="text-2xl leading-none">{m.icon}</span>
            <span className="text-[10px] font-bold mt-0.5" style={{ color: m.accent }}>{m.sub}</span>
          </div>
          <div className="text-sm font-semibold text-slate-600">{m.label}</div>
        </div>
      ))}
    </div>
  );
}
