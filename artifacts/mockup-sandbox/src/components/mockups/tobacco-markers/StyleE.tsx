export function StyleE() {
  const markers = [
    { label: "무인자판기", icon: "💨", sub: "무인", bg: "#bae6fd", border: "#38bdf8", text: "#0369a1" },
    { label: "오프라인매장", icon: "🌸", sub: "유인", bg: "#fce7f3", border: "#f9a8d4", text: "#be185d" },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-pink-50 flex flex-col items-center justify-center gap-10 p-8">
      <div className="text-center mb-2">
        <div className="text-lg font-bold text-slate-700">스타일 E</div>
        <div className="text-sm text-slate-400">파스텔 소프트 스타일</div>
      </div>
      {markers.map((m) => (
        <div key={m.label} className="flex flex-col items-center gap-2">
          <div
            className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center shadow-md border-2"
            style={{ background: m.bg, borderColor: m.border }}
          >
            <span className="text-3xl">{m.icon}</span>
          </div>
          <div className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: m.border, color: m.text }}>
            {m.sub}
          </div>
          <div className="text-sm font-semibold" style={{ color: m.text }}>{m.label}</div>
        </div>
      ))}
    </div>
  );
}
