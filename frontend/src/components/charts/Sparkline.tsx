import { useState } from "react";
import { LAB } from "../../theme/lab";

/** Compact trend line. Optional hover shows a dot + value tooltip. */
export default function Sparkline({
  data, color = LAB.chart, w = 60, h = 24, fill = false, hover = false, suffix = "",
}: { data: number[]; color?: string; w?: number; h?: number; fill?: boolean; hover?: boolean; suffix?: string }) {
  const [hi, setHi] = useState<number | null>(null);
  if (!data.length) return <svg width={w} height={h} />;
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const X = (i: number) => (i / (data.length - 1 || 1)) * w;
  const Y = (v: number) => h - ((v - min) / rng) * (h - 4) - 2;
  const line = data.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
  const gid = `sp-${color.replace("#", "")}-${w}`;
  const svg = (
    <svg width={w} height={h} className="block">
      {fill && (<>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.35" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${gid})`} />
      </>)}
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {hover && hi != null && <circle cx={X(hi)} cy={Y(data[hi])} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />}
    </svg>
  );
  if (!hover) return svg;
  return (
    <div className="relative" style={{ width: w }}
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHi(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (data.length - 1))); }}
      onMouseLeave={() => setHi(null)}>
      {svg}
      {hi != null && (
        <div className="absolute -translate-x-1/2 -top-6 pointer-events-none z-10" style={{ left: `${(hi / (data.length - 1 || 1)) * 100}%` }}>
          <div className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap" style={{ background: LAB.ink }}>{Math.round(data[hi])}{suffix}</div>
        </div>
      )}
    </div>
  );
}
