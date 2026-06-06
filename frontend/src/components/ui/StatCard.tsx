import { LAB, CARD_SHADOW } from "../../theme/lab";
import { TrendingUp, TrendingDown } from "lucide-react";
import Sparkline from "../charts/Sparkline";

/** KPI card: label, big value, trend delta badge, mini sparkline. */
export default function StatCard({
  label, value, delta, up, spark, className = "",
}: { label: string; value: React.ReactNode; delta?: string; up?: boolean; spark?: number[]; className?: string }) {
  return (
    <div className={`rounded-2xl p-4 ${className}`} style={{ background: LAB.card, boxShadow: CARD_SHADOW }}>
      <div className="flex items-start justify-between">
        <span className="text-[12px]" style={{ color: LAB.sub }}>{label}</span>
        {delta && (
          <span className="text-[11px] font-semibold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
            style={up ? { background: LAB.limeSoft, color: LAB.chart } : { background: "#FEE2E2", color: "#B91C1C" }}>
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />} {delta}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between mt-2 gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {spark && <Sparkline data={spark} />}
      </div>
    </div>
  );
}
