import { LAB, CARD_SHADOW } from "../../theme/lab";
import { TrendingUp, TrendingDown } from "lucide-react";
import Sparkline from "../charts/Sparkline";

/** KPI card: label, big value, optional trend delta badge, optional sparkline,
 *  optional icon chip (shown top-right when there's no delta). */
export default function StatCard({
  label, value, delta, up, spark, icon, warn, className = "",
}: { label: string; value: React.ReactNode; delta?: string; up?: boolean; spark?: number[]; icon?: React.ReactNode; warn?: boolean; className?: string }) {
  return (
    <div className={`rounded-2xl p-4 ${className}`} style={{ background: LAB.card, boxShadow: CARD_SHADOW }}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px]" style={{ color: LAB.sub }}>{label}</span>
        {delta ? (
          <span className="text-[11px] font-semibold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
            style={up ? { background: LAB.limeSoft, color: LAB.chart } : { background: "#FEE2E2", color: "#B91C1C" }}>
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />} {delta}
          </span>
        ) : icon ? (
          <span className="flex size-7 items-center justify-center rounded-lg shrink-0"
            style={warn ? { background: "#FEE2E2", color: "#B91C1C" } : { background: LAB.limeSoft, color: LAB.chart }}>{icon}</span>
        ) : null}
      </div>
      <div className="flex items-end justify-between mt-2 gap-2">
        <span className={`text-2xl font-bold ${warn ? "text-red-600" : ""}`}>{value}</span>
        {spark && <Sparkline data={spark} />}
      </div>
    </div>
  );
}
