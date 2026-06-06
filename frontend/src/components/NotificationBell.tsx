import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { staffApi } from "../api";
import {
  Bell, Users, CreditCard, AlertTriangle, ShoppingCart, PackageCheck, Gauge, Check,
} from "lucide-react";

type Note = { id: string; icon: any; text: string; tone: "red" | "amber" | "teal"; to: string };

const TONE: Record<string, string> = {
  red:   "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
  teal:  "bg-teal-50 text-primary",
};

export default function NotificationBell({ role }: { role: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const canCustomers = ["admin", "central_team", "sales"].includes(role);
  const canFinance   = ["admin", "finance", "central_team"].includes(role);
  const canMfg       = ["admin", "central_team", "operations"].includes(role);

  const { data: pending = [] } = useQuery({
    queryKey: ["pending-customers"],
    queryFn: () => staffApi.get("/customers/pending").then((r) => r.data),
    enabled: canCustomers, refetchInterval: 30_000,
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["pending-payments"],
    queryFn: () => staffApi.get("/finance/payments").then((r) => r.data),
    enabled: canFinance, refetchInterval: 30_000,
  });
  const { data: mfg } = useQuery<any>({
    queryKey: ["mfg-dashboard"],
    queryFn: () => staffApi.get("/admin/dashboard/manufacturing").then((r) => r.data),
    enabled: canMfg, refetchInterval: 30_000,
  });

  const notes: Note[] = [];
  if (canCustomers && pending.length > 0)
    notes.push({ id: "approvals", icon: Users, tone: "amber", to: "/staff/customers",
      text: `${pending.length} customer${pending.length > 1 ? "s" : ""} awaiting approval` });
  if (canFinance && payments.length > 0)
    notes.push({ id: "payments", icon: CreditCard, tone: "amber", to: "/staff/orders?filter=payment_uploaded",
      text: `${payments.length} payment${payments.length > 1 ? "s" : ""} to verify` });
  if (canMfg && mfg) {
    const k = mfg.kpis;
    if (k.rm_critical_alerts > 0)
      notes.push({ id: "rm", icon: AlertTriangle, tone: "red", to: "/staff/raw-materials",
        text: `${k.rm_critical_alerts} raw material${k.rm_critical_alerts > 1 ? "s" : ""} below reorder point` });
    if (k.active_reorder_signals > 0)
      notes.push({ id: "reorder", icon: ShoppingCart, tone: "amber", to: "/staff/procurement",
        text: `${k.active_reorder_signals} reorder signal${k.active_reorder_signals > 1 ? "s" : ""} to action` });
    if (k.fg_below_safety > 0)
      notes.push({ id: "fg", icon: PackageCheck, tone: "amber", to: "/staff/finished-goods",
        text: `${k.fg_below_safety} product${k.fg_below_safety > 1 ? "s" : ""} below safety stock` });
    if (k.plants_over_capacity > 0)
      notes.push({ id: "cap", icon: Gauge, tone: "red", to: "/staff/production",
        text: `${k.plants_over_capacity} plant${k.plants_over_capacity > 1 ? "s" : ""} over capacity` });
  }

  const count = notes.length;

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="relative text-ink-3 hover:text-ink transition-colors"
        title={count > 0 ? `${count} alert${count > 1 ? "s" : ""}` : "No alerts"}>
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">{count}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-[320px] bg-surface rounded-2xl shadow-[var(--shadow-lg)] border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="font-bold text-sm">Notifications</span>
              {count > 0 && <span className="text-[11px] font-semibold text-ink-4">{count} alert{count > 1 ? "s" : ""}</span>}
            </div>
            {count === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="size-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-2"><Check className="size-5" /></div>
                <p className="text-sm text-ink-3">All clear — nothing needs attention.</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto">
                {notes.map((n) => {
                  const Icon = n.icon;
                  return (
                    <button key={n.id} onClick={() => { setOpen(false); navigate(n.to); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-canvas text-left border-b border-border last:border-0 transition-colors">
                      <span className={`flex size-8 items-center justify-center rounded-lg shrink-0 ${TONE[n.tone]}`}><Icon className="size-4" /></span>
                      <span className="text-sm text-ink-2 flex-1">{n.text}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
