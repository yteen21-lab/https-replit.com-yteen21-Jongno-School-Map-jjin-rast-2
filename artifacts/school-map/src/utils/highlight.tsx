import React from "react";

/**
 * 텍스트에서 query 토큰(들)을 모두 노란색으로 강조 표시.
 * query는 공백으로 구분된 여러 단어를 지원하며, 겹치는 구간은 병합됩니다.
 */
export function highlight(text: string | undefined | null, query: string): React.ReactNode {
  if (!text) return <></>;
  if (!query) return <>{text}</>;

  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <>{text}</>;

  const lower = text.toLowerCase();
  const intervals: Array<[number, number]> = [];

  for (const token of tokens) {
    let idx = 0;
    while (idx < lower.length) {
      const found = lower.indexOf(token, idx);
      if (found === -1) break;
      intervals.push([found, found + token.length]);
      idx = found + 1;
    }
  }

  if (intervals.length === 0) return <>{text}</>;

  /* 겹치는 구간 병합 */
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const iv of intervals) {
    if (merged.length && iv[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], iv[1]);
    } else {
      merged.push([iv[0], iv[1]]);
    }
  }

  const parts: React.ReactNode[] = [];
  let pos = 0;
  for (const [start, end] of merged) {
    if (pos < start) parts.push(text.slice(pos, start));
    parts.push(
      <mark key={start} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">
        {text.slice(start, end)}
      </mark>
    );
    pos = end;
  }
  if (pos < text.length) parts.push(text.slice(pos));

  return <>{parts}</>;
}
