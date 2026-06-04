import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { staffApi } from "../../api";

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
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Analytics</h1>
          <p>Business performance overview</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: "6px 12px", borderRadius: 99, fontSize: 13, fontWeight: 600,
                border: `2px solid ${days === d ? "var(--blue)" : "var(--border)"}`,
                background: days === d ? "var(--blue)" : "var(--surface)",
                color: days === d ? "#fff" : "var(--ink-2)", cursor: "pointer",
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total Orders</div>
            <div className="kpi-value">{summary.total_orders}</div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-label">Revenue (Closed)</div>
            <div className="kpi-value" style={{ fontSize: 18 }}>${summary.total_revenue.toLocaleString()}</div>
          </div>
          <div className="kpi-card blue">
            <div className="kpi-label">Pipeline</div>
            <div className="kpi-value" style={{ fontSize: 18 }}>${summary.pending_revenue.toLocaleString()}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Active Orders</div>
            <div className="kpi-value">{summary.active_orders}</div>
          </div>
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
            📋 Export Orders (last {days} days) → CSV
          </button>
          <button className="btn btn-secondary btn-full" style={{ justifyContent: "flex-start" }} onClick={() => handleExport("payments")}>
            💳 Export Payments (last {days} days) → CSV
          </button>
          <button className="btn btn-secondary btn-full" style={{ justifyContent: "flex-start" }} onClick={() => handleExport("customers")}>
            👥 Export All Customers → CSV
          </button>
        </div>
      </div>
    </>
  );
}
