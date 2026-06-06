import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { staffApi } from "../../api";
import { ClipboardList, CreditCard, Users, DollarSign, TrendingUp, Activity } from "lucide-react";

const ic = { display: "inline", verticalAlign: "-3px", marginRight: 6 } as const;

function AnalKpi({ featured, label, value, icon }: { featured?: boolean; label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className={`rounded-2xl p-5 ${featured ? "bg-sidebar text-white" : "bg-surface shadow-[var(--shadow-sm)]"}`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[13px] font-medium ${featured ? "text-white/60" : "text-ink-3"}`}>{label}</span>
        <span className={`flex size-7 items-center justify-center rounded-lg ${featured ? "bg-white/10 text-accent" : "bg-teal-50 text-primary"}`}>{icon}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30);

  const { data: summary } = useQuery({
    queryKey: ["analytics-summary", days],
    queryFn: () => staffApi.get(`/admin/analytics/summary?days=${days}`).then(r => r.data),
  });

  const { data: topCustomers = [] } = useQuery({
    queryKey: ["analytics-customers", days],
    queryFn: () => staffApi.get(`/admin/analytics/top-customers?days=${days}&limit=8`).then(r => r.data),
  });

  const { data: topSkus = [] } = useQuery({
    queryKey: ["analytics-skus", days],
    queryFn: () => staffApi.get(`/admin/analytics/top-skus?days=${days}&limit=6`).then(r => r.data),
  });

  const { data: revenueData = [] } = useQuery({
    queryKey: ["analytics-revenue", days],
    queryFn: () => staffApi.get(`/admin/analytics/revenue-over-time?days=${days}`).then(r => r.data),
  });

  const maxRevenue = Math.max(...revenueData.map((d: any) => d.revenue), 1);

  const handleExport = (type: string) => {
    staffApi.get(`/admin/export/${type}?days=${days}`, { responseType: "blob" }).then(r => {
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
    });
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Analytics</h1>
          <p className="text-sm text-ink-3">Business performance overview</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border-2 transition-colors ${
                days === d ? "bg-primary border-primary text-white" : "bg-surface border-border text-ink-2 hover:border-primary"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <AnalKpi featured label="Total Orders" value={summary.total_orders} icon={<ClipboardList className="size-4" />} />
          <AnalKpi label="Revenue (Closed)" value={`$${summary.total_revenue.toLocaleString()}`} icon={<DollarSign className="size-4" />} />
          <AnalKpi label="Pipeline" value={`$${summary.pending_revenue.toLocaleString()}`} icon={<TrendingUp className="size-4" />} />
          <AnalKpi label="Active Orders" value={summary.active_orders} icon={<Activity className="size-4" />} />
        </div>
      )}

      {/* Revenue chart */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Revenue over time</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80, overflowX: "auto" }}>
          {revenueData.slice(-30).map((d: any, i: number) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 8 }}>
              <div
                title={`${d.date}: $${d.revenue}`}
                style={{
                  width: "100%", borderRadius: "3px 3px 0 0",
                  background: d.revenue > 0 ? "var(--blue)" : "var(--border)",
                  height: `${Math.max(2, (d.revenue / maxRevenue) * 70)}px`,
                  transition: "height .2s",
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
          <span>{revenueData[0]?.date}</span>
          <span>{revenueData[revenueData.length - 1]?.date}</span>
        </div>
      </div>

      {/* Top customers */}
      <div className="card" style={{ padding: 0, marginBottom: 14 }}>
        <div style={{ padding: "14px 16px 0", fontWeight: 700, fontSize: 14 }}>Top Customers ({days}d)</div>
        {topCustomers.length === 0 ? (
          <div className="empty-state" style={{ padding: "16px" }}><p>No data yet</p></div>
        ) : topCustomers.map((c: any, i: number) => (
          <div key={c.customer_id} className="list-item" style={{ display: "flex" }}>
            <div className="list-item-icon" style={{ fontWeight: 700, fontSize: 13, color: "var(--ink-3)", width: 32 }}>#{i + 1}</div>
            <div className="list-item-body">
              <div className="list-item-title">{c.name}</div>
              <div className="list-item-sub">{c.company_name || "—"} · {c.order_count} orders</div>
            </div>
            <div className="list-item-right">
              <div className="list-item-amount">${c.total_spent.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Top SKUs */}
      <div className="card" style={{ padding: 0, marginBottom: 14 }}>
        <div style={{ padding: "14px 16px 0", fontWeight: 700, fontSize: 14 }}>Top Products ({days}d)</div>
        {topSkus.length === 0 ? (
          <div className="empty-state" style={{ padding: "16px" }}><p>No data yet</p></div>
        ) : topSkus.map((s: any, i: number) => (
          <div key={s.sku_id} className="list-item" style={{ display: "flex" }}>
            <div className="list-item-icon" style={{ fontWeight: 700, fontSize: 13, color: "var(--ink-3)", width: 32 }}>#{i + 1}</div>
            <div className="list-item-body">
              <div className="list-item-title">{s.name}</div>
              <div className="list-item-sub">{s.total_qty} {s.unit} sold</div>
            </div>
            <div className="list-item-right">
              <div className="list-item-amount">${s.total_revenue.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Export Data</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="btn btn-secondary btn-full" style={{ justifyContent: "flex-start" }} onClick={() => handleExport("orders")}>
            <ClipboardList size={15} style={ic} /> Export Orders (last {days} days)
          </button>
          <button className="btn btn-secondary btn-full" style={{ justifyContent: "flex-start" }} onClick={() => handleExport("payments")}>
            <CreditCard size={15} style={ic} /> Export Payments (last {days} days)
          </button>
          <button className="btn btn-secondary btn-full" style={{ justifyContent: "flex-start" }} onClick={() => handleExport("customers")}>
            <Users size={15} style={ic} /> Export All Customers
          </button>
        </div>
      </div>
    </>
  );
}
