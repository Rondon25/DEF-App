import { useState } from "react";
import { LAB } from "../../theme/lab";

export interface BarRow { label: string; value: number; sub?: string }

/** Horizontal labelled bars (e.g. stock levels). Hover highlights a row + tooltip. */
export default function BarChart({
  data, valueFmt, max,
}: { data: BarRow[]; valueFmt?: (v: number) => string; max?: number }) {
  const [hi, setHi] = useState<number | null>(null);
  if (!data.length) return <div className="text-[13px]" style={{ color: LAB.sub }}>No data</div>;
  const top = max ?? Math.max(...data.map(d => d.value), 1);
  const fmt = (v: number) => valueFmt ? valueFmt(v) : Math.round(v).toLocaleString("en-IN");
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
          <div className="flex justify-between text-[13px] mb-1">
            <span className="truncate pr-2">{d.label}</span>
            <span className="font-semibold shrink-0">{fmt(d.value)}</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: LAB.canvas }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${Math.max(4, (d.value / top) * 100)}%`, background: hi === i ? LAB.accent : (i === 0 ? LAB.accent : LAB.chart) }} />
          </div>
        </div>
      ))}
    </div>
  );
}
