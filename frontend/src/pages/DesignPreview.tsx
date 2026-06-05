/**
 * Design Preview — faithful port of the Prodexa reference, scoped under `.rep`
 * so the app's global.css (which shares class names like .sidebar/.data-table)
 * cannot interfere. Teal primary + lime accent + navy sidebar.
 */

const CSS = `
.rep, .rep * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, sans-serif; }
.rep {
  --sidebar-bg:#1e1e2d; --main-bg:#f8f9fa; --accent:#d9f99d; --teal:#0d9488;
  --text-primary:#1a1a1a; --text-secondary:#6c757d;
  --card-shadow:0 4px 20px rgba(0,0,0,.05); --radius:16px;
  background:var(--main-bg); color:var(--text-primary);
}
.rep .wrap { display:grid; grid-template-columns:260px minmax(0,1fr); min-height:100vh; }

/* Sidebar */
.rep .sidebar { background:var(--sidebar-bg); color:#fff; padding:24px; display:flex; flex-direction:column; }
.rep .sb-head { display:flex; align-items:center; gap:12px; margin-bottom:40px; }
.rep .logo { background:var(--accent); color:#000; width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
.rep .logo-text { font-size:19px; font-weight:700; color:var(--accent); }
.rep .nav-group { margin-bottom:32px; }
.rep .nav-label { color:#888; text-transform:uppercase; font-size:11px; font-weight:600; margin-bottom:14px; letter-spacing:.04em; }
.rep .nav-item { display:flex; align-items:center; gap:12px; padding:11px 16px; text-decoration:none; color:#a0a0b0; border-radius:50px; margin-bottom:4px; transition:.2s; font-size:14px; }
.rep .nav-item:hover { background:#2a2a3c; color:#fff; }
.rep .nav-item.active { background:var(--accent); color:#1e1e2d; font-weight:600; }
.rep .nav-ic { width:18px; height:18px; flex-shrink:0; }
.rep .team { margin-top:auto; background:var(--accent); padding:12px; border-radius:20px; display:flex; align-items:center; justify-content:space-between; color:#1e1e2d; }
.rep .team-info { display:flex; align-items:center; gap:10px; }
.rep .team-av { background:#fff; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; }
.rep .team-name { font-weight:600; font-size:14px; } .rep .team-count { font-size:12px; opacity:.7; }

/* Main */
.rep .main { padding:24px 36px; overflow-y:auto; min-width:0; }
.rep .topbar { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:30px; }
.rep .crumb { font-weight:600; font-size:14px; white-space:nowrap; }
.rep .search { position:relative; flex:1; max-width:420px; }
.rep .search input { width:100%; padding:11px 16px 11px 40px; border-radius:50px; border:1px solid #eee; background:#fff; font-size:14px; }
.rep .search .si { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#999; }
.rep .actions { display:flex; align-items:center; gap:14px; }
.rep .ic-btn { background:none; border:none; font-size:18px; cursor:pointer; color:#6c757d; }
.rep .user { display:flex; align-items:center; gap:10px; background:#1e1e2d; color:#fff; padding:6px 16px 6px 6px; border-radius:50px; font-size:13px; white-space:nowrap; }
.rep .user-av { width:30px; height:30px; border-radius:50%; background:var(--accent); color:#1e1e2d; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; }

.rep .welcome { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:24px; gap:16px; flex-wrap:wrap; }
.rep .welcome h1 { font-size:24px; margin-bottom:4px; }
.rep .welcome p { color:var(--text-secondary); font-size:14px; }
.rep .filters { display:flex; gap:10px; }
.rep .drop { padding:10px 18px; border-radius:50px; border:1px solid #ddd; background:#fff; cursor:pointer; font-size:14px; font-weight:500; }
.rep .export { padding:10px 20px; border-radius:50px; background:#1e1e2d; color:#fff; border:none; cursor:pointer; font-size:14px; font-weight:600; }

/* KPI */
.rep .kpis { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; margin-bottom:22px; }
.rep .kpi { background:#fff; padding:22px; border-radius:var(--radius); box-shadow:var(--card-shadow); }
.rep .kpi.dark { background:#1e1e2d; color:#fff; }
.rep .kpi-head { display:flex; justify-content:space-between; align-items:center; font-size:13px; margin-bottom:18px; color:#6c757d; }
.rep .kpi.dark .kpi-head { color:rgba(255,255,255,.6); }
.rep .pill { background:var(--accent); color:#1e1e2d; padding:4px 12px; border-radius:50px; font-size:11px; font-weight:600; }
.rep .pill.light { background:#f0f0f0; color:#6c757d; }
.rep .kpi-val { font-size:30px; font-weight:700; margin-bottom:6px; }
.rep .kpi-val .u { font-size:15px; font-weight:400; color:#94a3b8; }
.rep .kpi-trend { font-size:12px; font-weight:500; color:#16a34a; }
.rep .kpi.dark .kpi-trend { color:var(--accent); }
.rep .kpi-trend.warn { color:#d97706; }

/* Middle */
.rep .mid { display:grid; grid-template-columns:2fr minmax(0,1fr); gap:18px; margin-bottom:22px; }
.rep .panel { background:#fff; padding:22px; border-radius:var(--radius); box-shadow:var(--card-shadow); min-width:0; }
.rep .panel-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; }
.rep .panel-head h3 { font-size:16px; }
.rep .chart-row { display:flex; justify-content:space-between; align-items:center; gap:16px; }
.rep .legend { list-style:none; margin-top:18px; }
.rep .legend li { font-size:14px; margin-bottom:10px; display:flex; align-items:center; gap:8px; color:#555; }
.rep .legend .v { margin-left:auto; font-weight:600; color:#000; }
.rep .dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.rep .donut { width:170px; height:170px; border-radius:50%; flex-shrink:0; position:relative;
  background:conic-gradient(#0d9488 0% 72%, #bef264 72% 90%, #cbd5e1 90% 100%); }
.rep .donut::after { content:''; position:absolute; inset:34px; background:#fff; border-radius:50%; }
.rep .donut span { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:20px; z-index:1; }
.rep .act { display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #f0f0f0; border-radius:12px; margin-bottom:10px; }
.rep .act-badge { font-size:10px; font-weight:700; padding:4px 8px; border-radius:6px; text-transform:uppercase; flex-shrink:0; }
.rep .act-badge.new { background:#ccfbf1; color:#0f766e; } .rep .act-badge.done { background:#f1f5f9; color:#64748b; }
.rep .act-txt { flex:1; font-weight:500; font-size:14px; } .rep .act-time { color:#94a3b8; font-size:12px; }

/* Table */
.rep .table-card { background:#fff; padding:22px; border-radius:var(--radius); box-shadow:var(--card-shadow); }
.rep .tscroll { overflow-x:auto; }
.rep table { width:100%; border-collapse:collapse; min-width:560px; }
.rep th { text-align:left; padding:14px 12px; color:#888; font-size:13px; font-weight:500; border-bottom:1px solid #f0f0f0; }
.rep td { padding:14px 12px; font-size:14px; border-bottom:1px solid #f0f0f0; }
.rep tr:last-child td { border-bottom:none; }
.rep .ono { font-weight:600; font-family:'JetBrains Mono',monospace; }
.rep .amt { text-align:right; font-weight:600; }
.rep .sb { font-size:11px; font-weight:600; padding:4px 10px; border-radius:50px; }
.rep .sb-amber { background:#fef3c7; color:#b45309; } .rep .sb-teal { background:#ccfbf1; color:#0f766e; }
.rep .sb-purple { background:#ede9fe; color:#6d28d9; } .rep .sb-green { background:#dcfce7; color:#15803d; }
.rep .sb-gray { background:#f1f5f9; color:#64748b; }
.rep .foot { text-align:center; font-size:12px; color:#94a3b8; margin:28px 0 16px; }
`;

const NAV_MAIN = [["⊞", "Dashboard", true], ["📋", "Orders"], ["👥", "Customers"], ["💳", "Payments"]];
const NAV_OTHER = [["🗂️", "Catalogue"], ["📦", "Stock"], ["📊", "Analytics"], ["⚙️", "Settings"]];
const ORDERS = [
  ["DEF-555752", "PS Transport", "23/04/2026", "Invoice Sent", "amber", "$340.00"],
  ["DEF-418730", "King Bob Logistics", "22/04/2026", "Confirmed", "teal", "$1,140.00"],
  ["DEF-902244", "Ron Don Fleet", "21/04/2026", "Shipped", "purple", "$760.00"],
  ["DEF-771203", "Acme Mining", "20/04/2026", "Delivered", "green", "$4,200.00"],
  ["DEF-660198", "Sharma Haulage", "19/04/2026", "Closed", "gray", "$190.00"],
];

export default function DesignPreview() {
  return (
    <div className="rep">
      <style>{CSS}</style>
      <div className="wrap">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sb-head">
            <div className="logo">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C8 8 6 11 6 14a6 6 0 0 0 12 0c0-3-2-6-6-12z"/></svg>
            </div>
            <span className="logo-text">Rohan Energy</span>
          </div>

          <nav className="nav-group">
            <p className="nav-label">Overview</p>
            {NAV_MAIN.map(([ic, label, active]) => (
              <a key={label as string} href="#" className={`nav-item ${active ? "active" : ""}`}>
                <span className="nav-ic">{ic}</span> {label}
              </a>
            ))}
          </nav>
          <nav className="nav-group">
            <p className="nav-label">Other</p>
            {NAV_OTHER.map(([ic, label]) => (
              <a key={label as string} href="#" className="nav-item">
                <span className="nav-ic">{ic}</span> {label}
              </a>
            ))}
          </nav>

          <div className="team">
            <div className="team-info">
              <div className="team-av">RE</div>
              <div><p className="team-name">Central Team</p><p className="team-count">5 staff</p></div>
            </div>
            <span>⌄</span>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <header className="topbar">
            <div className="crumb">Dashboard</div>
            <div className="search"><span className="si">🔍</span><input placeholder="Search orders, customers..." /></div>
            <div className="actions">
              <button className="ic-btn">🔔</button>
              <button className="ic-btn">⚙️</button>
              <div className="user"><div className="user-av">CT</div> Central Team ⌄</div>
            </div>
          </header>

          <div className="welcome">
            <div><h1>Welcome back!</h1><p>Today, 23 April 2026</p></div>
            <div className="filters">
              <div className="drop">🕒 Last 30 days ⌄</div>
              <button className="export">Export ⌄</button>
            </div>
          </div>

          {/* KPIs */}
          <div className="kpis">
            <div className="kpi dark">
              <div className="kpi-head"><span>Total Orders</span><span className="pill">Today ⌄</span></div>
              <div className="kpi-val">1,248</div>
              <div className="kpi-trend">↑ 12% from last month</div>
            </div>
            <div className="kpi">
              <div className="kpi-head"><span>Revenue</span><span className="pill light">Today ⌄</span></div>
              <div className="kpi-val">$84.2<span className="u">k</span></div>
              <div className="kpi-trend">↑ 8% MoM</div>
            </div>
            <div className="kpi">
              <div className="kpi-head"><span>In Transit</span><span className="pill light">Today ⌄</span></div>
              <div className="kpi-val">36</div>
              <div className="kpi-trend">6 delivering today</div>
            </div>
            <div className="kpi">
              <div className="kpi-head"><span>Pending Payment</span><span className="pill light">Today ⌄</span></div>
              <div className="kpi-val">14</div>
              <div className="kpi-trend warn">3 overdue</div>
            </div>
          </div>

          {/* Middle */}
          <div className="mid">
            <div className="panel">
              <div className="panel-head"><h3>Order Status Breakdown</h3><span className="pill light">This month ⌄</span></div>
              <div className="chart-row">
                <div>
                  <p style={{ color: "#6c757d", fontSize: 14 }}>Total Orders</p>
                  <h2 style={{ fontSize: 30, margin: "4px 0" }}>1,248</h2>
                  <p className="kpi-trend">↑ 12% from last month</p>
                  <ul className="legend">
                    <li><span className="dot" style={{ background: "#0d9488" }} /> Active <span className="v">982</span></li>
                    <li><span className="dot" style={{ background: "#bef264" }} /> Awaiting payment <span className="v">184</span></li>
                    <li><span className="dot" style={{ background: "#cbd5e1" }} /> Closed <span className="v">82</span></li>
                  </ul>
                </div>
                <div className="donut"><span>79%</span></div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><h3>Recent Activity</h3><span>⋯</span></div>
              {[["new", "Order DEF-902244 shipped", "2h ago"],
                ["new", "Payment verified — King Bob", "4h ago"],
                ["done", "Order DEF-771203 delivered", "Yesterday"],
                ["new", "New customer approved", "Yesterday"]].map(([s, txt, time], i) => (
                <div className="act" key={i}>
                  <span className={`act-badge ${s}`}>{s === "new" ? "New" : "Done"}</span>
                  <span className="act-txt">{txt}</span>
                  <span className="act-time">{time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="table-card">
            <div className="panel-head"><h3>Recent Orders</h3><button className="drop" style={{ padding: "6px 14px", fontSize: 13 }}>⚙️ Filter</button></div>
            <div className="tscroll">
              <table>
                <thead><tr><th>Order #</th><th>Customer</th><th>Date</th><th>Status</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
                <tbody>
                  {ORDERS.map(([no, cust, date, label, tone, amt]) => (
                    <tr key={no}>
                      <td className="ono">{no}</td>
                      <td>{cust}</td>
                      <td style={{ color: "#6c757d" }}>{date}</td>
                      <td><span className={`sb sb-${tone}`}>{label}</span></td>
                      <td className="amt">{amt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="foot">Design preview · teal + lime · Prodexa-inspired · /design-preview</p>
        </main>
      </div>
    </div>
  );
}
