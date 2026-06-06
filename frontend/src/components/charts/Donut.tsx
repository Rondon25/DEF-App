import { useState } from "react";
import { LAB } from "../../theme/lab";

export interface DonutSegment { value: number; color: string; label?: string; display?: string }

/** Donut with hover: hovered arc thickens, others dim, center shows that segment. */
export default function Donut({
  segments, centerTop, centerSub, size = 132, thickness = 16,
}: { segments: DonutSegment[]; centerTop: string; centerSub: string; size?: number; thickness?: number }) {
  const [hi, setHi] = useState<number | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const cx = size / 2, r = size / 2 - thickness / 2 - 4, c = 2 * Math.PI * r;
  let off = 0;
  const h = hi != null ? segments[hi] : null;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={LAB.canvas} strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color}
              strokeWidth={hi === i ? thickness + 5 : thickness}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off}
              transform={`rotate(-90 ${cx} ${cx})`} strokeLinecap="butt"
              style={{ cursor: "pointer", transition: "stroke-width .15s", opacity: hi == null || hi === i ? 1 : 0.45 }}
              onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} />
          );
          off += len; return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-3">
        {h ? (<><span className="text-[10px] truncate max-w-[92px]" style={{ color: LAB.sub }}>{h.label}</span><span className="text-[14px] font-bold">{h.display}</span></>)
           : (<><span className="text-[15px] font-bold">{centerTop}</span><span className="text-[10px]" style={{ color: LAB.sub }}>{centerSub}</span></>)}
      </div>
    </div>
  );
}
