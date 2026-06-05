/**
 * Design Preview — isolated iframe port of the Prodexa reference.
 * Line-art SVG icons (currentColor), teal primary + lime accent, navy sidebar.
 */

// ── Line-art icons (feather style, stroke=currentColor) ──────────────────────
const sv = (inner: string, w = 18) =>
  `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const I = {
  dashboard: sv('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'),
  orders:    sv('<path d="M9 4h6M9 4a1 1 0 0 0-1 1v1h8V5a1 1 0 0 0-1-1M7 6h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2"/><path d="M9 12h6M9 16h4"/>'),
  customers: sv('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>'),
  payments:  sv('<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>'),
  catalogue: sv('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>'),
  stock:     sv('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/>'),
  analytics: sv('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
  settings:  sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  search:    sv('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>', 17),
  bell:      sv('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>', 19),
  clock:     sv('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>', 15),
  chevron:   sv('<polyline points="6 9 12 15 18 9"/>', 14),
  filter:    sv('<polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/>', 14),
  droplet:   '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C8 8 6 11 6 14a6 6 0 0 0 12 0c0-3-2-6-6-12z"/></svg>',
};

const NAV_MAIN = [["dashboard", "Dashboard", true], ["orders", "Orders"], ["customers", "Customers"], ["payments", "Payments"]] as const;
const NAV_OTHER = [["catalogue", "Catalogue"], ["stock", "Stock"], ["analytics", "Analytics"], ["settings", "Settings"]] as const;

const navItems = (arr: readonly (readonly [string, string, boolean?])[]) =>
  arr.map(([ic, label, active]) =>
    `<a href="#" class="nav-item ${active ? "active" : ""}"><span class="nav-ic">${(I as any)[ic]}</span><span>${label}</span></a>`
  ).join("");

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
:root{
  --sidebar-bg:#1e1e2d; --main-bg:#f8f9fa; --accent:#d9f99d; --teal:#0d9488;
  --text-primary:#1a1a1a; --text-secondary:#6c757d;
  --card-shadow:0 4px 20px rgba(0,0,0,.05); --border-radius:16px;
}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',-apple-system,sans-serif;}
body{background:var(--main-bg);color:var(--text-primary);}
svg{display:block;}
.dashboard-container{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:100vh;}

/* Sidebar */
.sidebar{background:var(--sidebar-bg);color:#fff;padding:24px;display:flex;flex-direction:column;}
.sidebar-header{display:flex;align-items:center;gap:12px;margin-bottom:40px;}
.logo-icon{background:var(--accent);color:#1e1e2d;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;}
.logo-text{font-size:19px;font-weight:700;color:var(--accent);}
.nav-group{margin-bottom:32px;}
.nav-label{color:#888;text-transform:uppercase;font-size:11px;font-weight:600;letter-spacing:.05em;margin-bottom:14px;}
.nav-item{display:flex;align-items:center;gap:12px;padding:11px 16px;text-decoration:none;color:#a0a0b0;border-radius:50px;margin-bottom:4px;transition:.18s;font-size:14px;font-weight:500;}
.nav-item:hover{background:#2a2a3c;color:#fff;}
.nav-item.active{background:var(--accent);color:#1e1e2d;font-weight:600;}
.nav-ic{display:flex;align-items:center;justify-content:center;width:20px;flex-shrink:0;}
.team-card{margin-top:auto;background:var(--accent);padding:12px;border-radius:18px;display:flex;align-items:center;justify-content:space-between;color:#1e1e2d;}
.team-info{display:flex;align-items:center;gap:10px;}
.team-avatar{background:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;}
.team-name{font-weight:600;font-size:14px;line-height:1.2;}.team-count{font-size:12px;opacity:.65;}

/* Main */
.main-content{padding:24px 36px;overflow-y:auto;min-width:0;}
.top-bar{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:30px;}
.breadcrumb{font-weight:600;font-size:14px;white-space:nowrap;}
.search-container{position:relative;flex:1;max-width:400px;}
.search-input{width:100%;padding:11px 16px 11px 42px;border-radius:50px;border:1px solid #ececec;background:#fff;font-size:14px;color:#1a1a1a;}
.search-input::placeholder{color:#9aa0a6;}
.search-input:focus{outline:none;border-color:var(--teal);}
.search-icon{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:#9aa0a6;display:flex;}
.top-actions{display:flex;align-items:center;gap:14px;}
.icon-btn{background:none;border:none;cursor:pointer;color:#6c757d;display:flex;align-items:center;}
.icon-btn:hover{color:#1a1a1a;}
.user-profile{display:flex;align-items:center;gap:9px;background:#1e1e2d;color:#fff;padding:5px 14px 5px 5px;border-radius:50px;font-size:13px;font-weight:500;white-space:nowrap;}
.user-avatar{width:30px;height:30px;border-radius:50%;background:var(--accent);color:#1e1e2d;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;}
.user-profile .chev{color:#9aa0a6;display:flex;}

.welcome-section{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;gap:16px;flex-wrap:wrap;}
.welcome-text h1{font-size:23px;font-weight:700;margin-bottom:3px;letter-spacing:-.01em;}
.welcome-text p{color:var(--text-secondary);font-size:14px;}
.filter-actions{display:flex;gap:10px;}
.dropdown-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:50px;border:1px solid #e5e5e5;background:#fff;cursor:pointer;font-size:14px;font-weight:500;color:#1a1a1a;}
.export-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:50px;background:#1e1e2d;color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:600;}

/* KPI Grid */
.kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-bottom:22px;}
.kpi-card{background:#fff;padding:22px;border-radius:var(--border-radius);box-shadow:var(--card-shadow);display:flex;flex-direction:column;min-height:128px;}
.kpi-card.dark{background:#1e1e2d;color:#fff;}
.card-header{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:500;margin-bottom:16px;color:#6c757d;}
.kpi-card.dark .card-header{color:rgba(255,255,255,.6);}
.badge-pill{display:inline-flex;align-items:center;gap:5px;background:var(--accent);color:#1e1e2d;padding:5px 11px;border-radius:50px;font-size:11px;font-weight:600;}
.badge-pill.light{background:#f1f3f5;color:#6c757d;}
.badge-pill .chev{display:flex;}
.card-value{font-size:30px;font-weight:700;letter-spacing:-.02em;margin-top:auto;margin-bottom:6px;}
.card-value .unit{font-size:15px;font-weight:400;color:#94a3b8;}
.card-trend{font-size:12px;font-weight:500;color:#16a34a;}
.kpi-card.dark .card-trend{color:var(--accent);}
.card-trend.warn{color:#d97706;}

/* Middle Grid */
.middle-grid{display:grid;grid-template-columns:2fr minmax(0,1fr);gap:18px;margin-bottom:22px;}
.chart-card,.uptime-card,.table-card{background:#fff;padding:22px;border-radius:var(--border-radius);box-shadow:var(--card-shadow);min-width:0;}
.card-header-main{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;}
.card-header-main h3{font-size:16px;font-weight:700;}
.chart-content{display:flex;justify-content:space-between;align-items:center;gap:16px;}
.chart-stats .label{color:#6c757d;font-size:14px;}
.chart-stats h2{font-size:30px;font-weight:700;letter-spacing:-.02em;margin:4px 0;}
.legend-list{list-style:none;margin-top:18px;}
.legend-list li{font-size:14px;margin-bottom:11px;display:flex;align-items:center;gap:9px;color:#555;}
.legend-list .val{margin-left:auto;font-weight:600;color:#111;}
.dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.dot.active{background:var(--teal);}.dot.await{background:#bef264;}.dot.closed{background:#cbd5e1;}
.donut-chart{width:172px;height:172px;border-radius:50%;flex-shrink:0;position:relative;
  background:conic-gradient(var(--teal) 0% 72%,#bef264 72% 90%,#cbd5e1 90% 100%);}
.donut-chart::after{content:'';position:absolute;inset:34px;background:#fff;border-radius:50%;}
.donut-chart span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;z-index:1;}
.activity-item{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #f0f0f0;border-radius:12px;margin-bottom:9px;}
.activity-badge{font-size:10px;font-weight:700;padding:4px 8px;border-radius:6px;text-transform:uppercase;flex-shrink:0;letter-spacing:.03em;}
.activity-badge.new{background:#ccfbf1;color:#0f766e;}.activity-badge.done{background:#f1f5f9;color:#64748b;}
.activity-text{flex:1;font-weight:500;font-size:13.5px;line-height:1.3;}.activity-time{color:#94a3b8;font-size:12px;white-space:nowrap;}

/* Table */
.table-scroll{overflow-x:auto;}
.data-table{width:100%;border-collapse:collapse;margin-top:8px;min-width:560px;}
.data-table th{text-align:left;padding:14px 12px;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;border-bottom:1px solid #f0f0f0;}
.data-table td{padding:15px 12px;font-size:14px;border-bottom:1px solid #f4f4f4;}
.data-table tr:last-child td{border-bottom:none;}
.order-no{font-weight:600;font-family:'JetBrains Mono',monospace;font-size:13px;}
.amount{text-align:right;font-weight:600;}
.status-badge{display:inline-block;font-size:11px;font-weight:600;padding:4px 11px;border-radius:50px;}
.status-badge.amber{background:#fef3c7;color:#b45309;}
.status-badge.teal{background:#ccfbf1;color:#0f766e;}
.status-badge.purple{background:#ede9fe;color:#6d28d9;}
.status-badge.green{background:#dcfce7;color:#15803d;}
.status-badge.gray{background:#f1f5f9;color:#64748b;}
.filter-btn{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e5e5e5;padding:7px 14px;border-radius:9px;font-size:13px;font-weight:500;cursor:pointer;color:#1a1a1a;}
.foot{text-align:center;font-size:12px;color:#94a3b8;margin:28px 0 16px;}
</style>
</head>
<body>
<div class="dashboard-container">
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo-icon">${I.droplet}</div>
      <span class="logo-text">Rohan Energy</span>
    </div>
    <nav class="nav-group"><p class="nav-label">Overview</p>${navItems(NAV_MAIN)}</nav>
    <nav class="nav-group"><p class="nav-label">Other</p>${navItems(NAV_OTHER)}</nav>
    <div class="team-card">
      <div class="team-info">
        <div class="team-avatar">RE</div>
        <div><p class="team-name">Central Team</p><p class="team-count">5 staff</p></div>
      </div>
      ${I.chevron}
    </div>
  </aside>

  <main class="main-content">
    <header class="top-bar">
      <div class="breadcrumb">Dashboard</div>
      <div class="search-container">
        <span class="search-icon">${I.search}</span>
        <input type="text" placeholder="Search orders, customers..." class="search-input">
      </div>
      <div class="top-actions">
        <button class="icon-btn">${I.bell}</button>
        <button class="icon-btn">${I.settings}</button>
        <div class="user-profile"><div class="user-avatar">CT</div><span>Central Team</span><span class="chev">${I.chevron}</span></div>
      </div>
    </header>

    <div class="welcome-section">
      <div class="welcome-text"><h1>Welcome back!</h1><p>Today, 23 April 2026</p></div>
      <div class="filter-actions">
        <div class="dropdown-btn">${I.clock} Last 30 days ${I.chevron}</div>
        <button class="export-btn">Export ${I.chevron}</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card dark">
        <div class="card-header"><span>Total Orders</span><span class="badge-pill">Today <span class="chev">${I.chevron}</span></span></div>
        <div class="card-value">1,248</div>
        <div class="card-trend">&#8593; 12% from last month</div>
      </div>
      <div class="kpi-card">
        <div class="card-header"><span>Revenue</span><span class="badge-pill light">Today <span class="chev">${I.chevron}</span></span></div>
        <div class="card-value">$84.2<span class="unit">k</span></div>
        <div class="card-trend">&#8593; 8% MoM</div>
      </div>
      <div class="kpi-card">
        <div class="card-header"><span>In Transit</span><span class="badge-pill light">Today <span class="chev">${I.chevron}</span></span></div>
        <div class="card-value">36</div>
        <div class="card-trend">6 delivering today</div>
      </div>
      <div class="kpi-card">
        <div class="card-header"><span>Pending Payment</span><span class="badge-pill light">Today <span class="chev">${I.chevron}</span></span></div>
        <div class="card-value">14</div>
        <div class="card-trend warn">3 overdue</div>
      </div>
    </div>

    <div class="middle-grid">
      <div class="chart-card">
        <div class="card-header-main"><h3>Order Status Breakdown</h3><span class="badge-pill light">This month <span class="chev">${I.chevron}</span></span></div>
        <div class="chart-content">
          <div class="chart-stats">
            <p class="label">Total Orders</p>
            <h2>1,248</h2>
            <p class="card-trend">&#8593; 12% from last month</p>
            <ul class="legend-list">
              <li><span class="dot active"></span> Active <span class="val">982</span></li>
              <li><span class="dot await"></span> Awaiting payment <span class="val">184</span></li>
              <li><span class="dot closed"></span> Closed <span class="val">82</span></li>
            </ul>
          </div>
          <div class="donut-chart"><span>79%</span></div>
        </div>
      </div>
      <div class="uptime-card">
        <div class="card-header-main"><h3>Recent Activity</h3></div>
        <div class="activity-item"><span class="activity-badge new">New</span><span class="activity-text">Order DEF-902244 shipped</span><span class="activity-time">2h ago</span></div>
        <div class="activity-item"><span class="activity-badge new">New</span><span class="activity-text">Payment verified &mdash; King Bob</span><span class="activity-time">4h ago</span></div>
        <div class="activity-item"><span class="activity-badge done">Done</span><span class="activity-text">Order DEF-771203 delivered</span><span class="activity-time">Yesterday</span></div>
        <div class="activity-item"><span class="activity-badge new">New</span><span class="activity-text">New customer approved</span><span class="activity-time">Yesterday</span></div>
      </div>
    </div>

    <div class="table-card">
      <div class="card-header-main"><h3>Recent Orders</h3><button class="filter-btn">${I.filter} Filter</button></div>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Order #</th><th>Customer</th><th>Date</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            <tr><td class="order-no">DEF-555752</td><td>PS Transport</td><td style="color:#6c757d">23/04/2026</td><td><span class="status-badge amber">Invoice Sent</span></td><td class="amount">$340.00</td></tr>
            <tr><td class="order-no">DEF-418730</td><td>King Bob Logistics</td><td style="color:#6c757d">22/04/2026</td><td><span class="status-badge teal">Confirmed</span></td><td class="amount">$1,140.00</td></tr>
            <tr><td class="order-no">DEF-902244</td><td>Ron Don Fleet</td><td style="color:#6c757d">21/04/2026</td><td><span class="status-badge purple">Shipped</span></td><td class="amount">$760.00</td></tr>
            <tr><td class="order-no">DEF-771203</td><td>Acme Mining</td><td style="color:#6c757d">20/04/2026</td><td><span class="status-badge green">Delivered</span></td><td class="amount">$4,200.00</td></tr>
            <tr><td class="order-no">DEF-660198</td><td>Sharma Haulage</td><td style="color:#6c757d">19/04/2026</td><td><span class="status-badge gray">Closed</span></td><td class="amount">$190.00</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="foot">Design preview &middot; teal + lime &middot; Prodexa-inspired</p>
  </main>
</div>
</body>
</html>`;

export default function DesignPreview() {
  return (
    <iframe
      title="Rohan Energy — Design Preview"
      srcDoc={HTML}
      style={{ border: "none", width: "100vw", height: "100vh", display: "block" }}
    />
  );
}
