export function StyleC() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-10 p-8">
      <div className="text-center mb-2">
        <div className="text-lg font-bold text-slate-700">스타일 C</div>
        <div className="text-sm text-slate-400">SVG 드롭핀 스타일</div>
      </div>

      {/* 무인자판기 */}
      <div className="flex flex-col items-center gap-2">
        <svg width="48" height="60" viewBox="0 0 48 60">
          <path d="M24 0C10.7 0 0 10.7 0 24c0 18 24 36 24 36s24-18 24-36C48 10.7 37.3 0 24 0z" fill="#475569"/>
          <circle cx="24" cy="24" r="14" fill="white" opacity="0.15"/>
          <text x="24" y="30" textAnchor="middle" fontSize="18" fill="white">⚡</text>
        </svg>
        <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">무인자판기</div>
      </div>

      {/* 유인 오프라인 */}
      <div className="flex flex-col items-center gap-2">
        <svg width="48" height="60" viewBox="0 0 48 60">
          <path d="M24 0C10.7 0 0 10.7 0 24c0 18 24 36 24 36s24-18 24-36C48 10.7 37.3 0 24 0z" fill="#7c3aed"/>
          <circle cx="24" cy="24" r="14" fill="white" opacity="0.15"/>
          <text x="24" y="30" textAnchor="middle" fontSize="18" fill="white">🛍️</text>
        </svg>
        <div className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">오프라인매장</div>
      </div>
    </div>
  );
}
