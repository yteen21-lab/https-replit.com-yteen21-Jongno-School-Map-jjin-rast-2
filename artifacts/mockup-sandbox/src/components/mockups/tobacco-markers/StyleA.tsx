export function StyleA() {
  const markers = [
    { label: "무인자판기", emoji: "🤖", sub: "무인", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" },
    { label: "오프라인매장", emoji: "🏬", sub: "유인", color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" },
  ];
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-10 p-8">
      <div className="text-center mb-2">
        <div className="text-lg font-bold text-slate-700">스타일 A</div>
        <div className="text-sm text-slate-400">이모지 핀 스타일</div>
      </div>
      {markers.map((m) => (
        <div key={m.label} className="flex flex-col items-center gap-3">
          <div className="relative flex flex-col items-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-lg border-4 border-white"
              style={{ background: m.bg, borderColor: m.border, boxShadow: `0 4px 16px ${m.color}55` }}
            >
              {m.emoji}
            </div>
            <div
              className="mt-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ background: m.color }}
            >
              {m.sub}
            </div>
            <div className="w-0.5 h-4 mt-0.5" style={{ background: m.color }} />
            <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
          </div>
          <div className="text-sm font-semibold text-slate-600">{m.label}</div>
        </div>
      ))}
    </div>
  );
}
