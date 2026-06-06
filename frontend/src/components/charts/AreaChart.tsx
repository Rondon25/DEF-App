import { useState } from "react";
import { LAB } from "../../theme/lab";

export interface AreaPoint { label: string; value: number }

/** Area/line chart with hover guide line, marker dot, and value+label tooltip. */
export default function AreaChart({
  data, height = 120, color = LAB.chart, fillColor = LAB.accent, prefix = "", valueFmt,
}: { data: AreaPoint[]; height?: number; color?: string; fillColor?: string; prefix?: string; valueFmt?: (v: number) => string }) {
  const [hi, setHi] = useState<number | null>(null);
  const w = 440, h = height;
  if (!data.length) return <div className="flex items-center justify-center text-[13px]" style={{ height, color: LAB.sub }}>No data</div>;
  const vals = data.map(d => d.value);
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0), rng = max - min || 1;
  const X = (i: number) => (i / (data.length - 1 || 1)) * w;
  const Y = (v: number) => h - ((v - min) / rng) * (h - 10) - 5;
  const line = vals.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const frac = hi != null ? hi / (data.length - 1 || 1) : 0;
  const fmt = (v: number) => valueFmt ? valueFmt(v) : `${prefix}${Number(v).toLocaleString()}`;
  const gid = `area-${color.replace("#", "")}`;
  return (
    <div className="relative" onMouseLeave={() => setHi(null)}
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHi(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (data.length - 1))); }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block" style={{ height }}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={fillColor} stopOpacity="0.55" /><stop offset="100%" stopColor={fillColor} stopOpacity="0" /></linearGradient></defs>
        <polygon points={area} fill={`url(#${gid})`} />
        <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {hi != null && <line x1={X(hi)} y1="0" x2={X(hi)} y2={h} stroke={color} strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      </svg>
      {hi != null && (<>
        <div className="absolute size-2.5 rounded-full pointer-events-none" style={{ left: `${frac * 100}%`, top: Y(vals[hi]), background: color, border: "2px solid #fff", transform: "translate(-50%,-50%)" }} />
        <div className="absolute -translate-x-1/2 pointer-events-none z-10" style={{ left: `${frac * 100}%`, top: -6 }}>
          <div className="rounded-lg px-2 py-1 text-[11px] font-semibold text-white whitespace-nowrap text-center" style={{ background: LAB.ink }}>
            {fmt(vals[hi])}<div className="font-normal opacity-70 text-[10px]">{data[hi].label}</div>
          </div>
        </div>
      </>)}
      <div className="flex justify-between text-[11px] mt-2" style={{ color: LAB.sub }}><span>{data[0]?.label}</span><span>{data[data.length - 1]?.label}</span></div>
    </div>
  );
}
