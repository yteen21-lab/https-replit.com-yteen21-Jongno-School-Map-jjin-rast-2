export function StyleF() {
  const markers = [
    { label: "무인자판기", icon: "🔋", sub: "UNMANNED", color: "#0f172a", accent: "#22d3ee" },
    { label: "오프라인매장", icon: "💼", sub: "STAFFED", color: "#0f172a", accent: "#f472b6" },
  ];
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-10 p-8">
      <div className="text-center mb-2">
        <div className="text-lg font-bold text-white">스타일 F</div>
        <div className="text-sm text-slate-400">다크 미니멀</div>
      </div>
      {markers.map((m) => (
        <div key={m.label} className="flex flex-col items-center gap-2">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl border"
            style={{ background: "#1e293b", borderColor: m.accent, boxShadow: `0 0 12px ${m.accent}66` }}
          >
            {m.icon}
          </div>
          <div className="text-[10px] font-bold tracking-widest" style={{ color: m.accent }}>{m.sub}</div>
          <div className="text-sm font-semibold text-slate-300">{m.label}</div>
        </div>
      ))}
    </div>
  );
}
