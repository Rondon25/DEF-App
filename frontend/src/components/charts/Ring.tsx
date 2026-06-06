import { LAB } from "../../theme/lab";

/** Single-value progress ring. */
export default function Ring({
  value, size = 46, thickness = 5, color = LAB.chart, suffix = "%",
}: { value: number; size?: number; thickness?: number; color?: string; suffix?: string }) {
  const cx = size / 2, r = size / 2 - thickness;
  const c = 2 * Math.PI * r, len = (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={LAB.canvas} strokeWidth={thickness} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">{Math.round(value)}{suffix}</span>
    </div>
  );
}
