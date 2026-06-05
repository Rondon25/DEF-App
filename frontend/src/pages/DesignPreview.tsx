/**
 * Design Preview — rendered inside an isolated iframe (srcDoc) so the app's
 * global.css cannot interfere. This is a faithful port of the Prodexa
 * reference HTML/CSS, adapted to Rohan Energy data. Teal primary + lime accent.
 */

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
.dashboard-container{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:100vh;}

/* Sidebar */
.sidebar{background:var(--sidebar-bg);color:#fff;padding:24px;display:flex;flex-direction:column;}
.sidebar-header{display:flex;align-items:center;gap:12px;margin-bottom:40px;}
.logo-icon{background:var(--accent);color:#000;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;}
.logo-text{font-size:20px;font-weight:700;color:var(--accent);}
.nav-group{margin-bottom:32px;}
.nav-label{color:#888;text-transform:uppercase;font-size:12px;font-weight:600;margin-bottom:16px;}
.nav-item{display:flex;align-items:center;gap:12px;padding:12px 16px;text-decoration:none;color:#a0a0b0;border-radius:50px;margin-bottom:4px;transition:.2s;font-size:14px;}
.nav-item:hover{background:#2a2a3c;color:#fff;}
.nav-item.active{background:var(--accent);color:#1e1e2d;font-weight:600;}
.nav-item .ic{width:20px;text-align:center;flex-shrink:0;}
.team-card{margin-top:auto;background:var(--accent);padding:12px;border-radius:20px;display:flex;align-items:center;justify-content:space-between;color:#1e1e2d;}
.team-info{display:flex;align-items:center;gap:10px;}
.team-avatar{background:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;}
.team-name{font-weight:600;font-size:14px;}.team-count{font-size:12px;opacity:.7;}

/* Main */
.main-content{padding:24px 40px;overflow-y:auto;min-width:0;}
.top-bar{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:32px;}
.breadcrumb{font-weight:600;font-size:14px;white-space:nowrap;}
.search-container{position:relative;flex:1;max-width:400px;}
.search-input{width:100%;padding:10px 40px;border-radius:50px;border:1px solid #eee;background:#fff;font-size:14px;}
.search-icon{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:#999;}
.top-actions{display:flex;align-items:center;gap:15px;}
.icon-btn{background:none;border:none;font-size:18px;cursor:pointer;color:#6c757d;}
.user-profile{display:flex;align-items:center;gap:10px;background:#1e1e2d;color:#fff;padding:6px 16px 6px 6px;border-radius:50px;font-size:13px;white-space:nowrap;}
.user-avatar{width:32px;height:32px;border-radius:50%;background:var(--accent);color:#1e1e2d;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;}

.welcome-section{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;gap:16px;flex-wrap:wrap;}
.welcome-text h1{font-size:24px;margin-bottom:4px;}
.welcome-text p{color:var(--text-secondary);font-size:14px;}
.filter-actions{display:flex;gap:10px;}
.dropdown-btn{padding:10px 20px;border-radius:50px;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:14px;font-weight:500;}
.export-btn{padding:10px 20px;border-radius:50px;background:#1e1e2d;color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:600;}

/* KPI Grid */
.kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;margin-bottom:24px;}
.kpi-card{background:#fff;padding:24px;border-radius:var(--border-radius);box-shadow:var(--card-shadow);}
.kpi-card.dark{background:#1e1e2d;color:#fff;}
.card-header{display:flex;justify-content:space-between;align-items:center;font-size:14px;margin-bottom:20px;color:#6c757d;}
.kpi-card.dark .card-header{color:rgba(255,255,255,.6);}
.badge-pill{background:var(--accent);color:#1e1e2d;padding:4px 12px;border-radius:50px;font-size:12px;font-weight:600;}
.badge-pill.light{background:#f0f0f0;color:#6c757d;}
.card-value{font-size:32px;font-weight:700;margin-bottom:8px;}
.card-value .unit{font-size:16px;font-weight:400;color:#94a3b8;}
.card-trend{font-size:12px;font-weight:500;color:#16a34a;}
.kpi-card.dark .card-trend{color:var(--accent);}
.card-trend.warn{color:#d97706;}

/* Middle Grid */
.middle-grid{display:grid;grid-template-columns:2fr minmax(0,1fr);gap:20px;margin-bottom:24px;}
.chart-card,.uptime-card,.table-card{background:#fff;padding:24px;border-radius:var(--border-radius);box-shadow:var(--card-shadow);min-width:0;}
.card-header-main{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;}
.card-header-main h3{font-size:16px;}
.chart-content{display:flex;justify-content:space-between;align-items:center;gap:16px;}
.chart-stats .label{color:#6c757d;font-size:14px;}
.chart-stats h2{font-size:30px;margin:4px 0;}
.legend-list{list-style:none;margin-top:20px;}
.legend-list li{font-size:14px;margin-bottom:10px;display:flex;align-items:center;gap:8px;color:#555;}
.legend-list .val{margin-left:auto;font-weight:600;color:#000;}
.dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.dot.active{background:var(--teal);}.dot.await{background:#bef264;}.dot.closed{background:#cbd5e1;}
.donut-chart{width:180px;height:180px;border-radius:50%;flex-shrink:0;position:relative;
  background:conic-gradient(var(--teal) 0% 72%,#bef264 72% 90%,#cbd5e1 90% 100%);}
.donut-chart::after{content:'';position:absolute;inset:35px;background:#fff;border-radius:50%;}
.donut-chart span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;z-index:1;}
.activity-item{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #f0f0f0;border-radius:12px;margin-bottom:10px;}
.activity-badge{font-size:10px;font-weight:700;padding:4px 8px;border-radius:6px;text-transform:uppercase;flex-shrink:0;}
.activity-badge.new{background:#ccfbf1;color:#0f766e;}.activity-badge.done{background:#f1f5f9;color:#64748b;}
.activity-text{flex:1;font-weight:500;font-size:14px;}.activity-time{color:#94a3b8;font-size:12px;}

/* Table */
.table-scroll{overflow-x:auto;}
.data-table{width:100%;border-collapse:collapse;margin-top:10px;min-width:560px;}
.data-table th{text-align:left;padding:16px 12px;color:#888;font-size:13px;font-weight:500;border-bottom:1px solid #f0f0f0;}
.data-table td{padding:16px 12px;font-size:14px;border-bottom:1px solid #f0f0f0;}
.data-table tr:last-child td{border-bottom:none;}
.order-no{font-weight:600;font-family:'JetBrains Mono',monospace;}
.amount{text-align:right;font-weight:600;}
.status-badge{font-size:11px;font-weight:600;padding:4px 10px;border-radius:50px;}
.status-badge.amber{background:#fef3c7;color:#b45309;}
.status-badge.teal{background:#ccfbf1;color:#0f766e;}
.status-badge.purple{background:#ede9fe;color:#6d28d9;}
.status-badge.green{background:#dcfce7;color:#15803d;}
.status-badge.gray{background:#f1f5f9;color:#64748b;}
.filter-btn{background:#fff;border:1px solid #ddd;padding:6px 14px;border-radius:8px;font-size:13px;cursor:pointer;}
.foot{text-align:center;font-size:12px;color:#94a3b8;margin:28px 0 16px;}
</style>
</head>
<body>
<div class="dashboard-container">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C8 8 6 11 6 14a6 6 0 0 0 12 0c0-3-2-6-6-12z"/></svg>
      </div>
      <span class="logo-text">Rohan Energy</span>
    </div>
    <nav class="nav-group">
      <p class="nav-label">Overview</p>
      <a href="#" class="nav-item active"><span class="ic">&#9638;</span> Dashboard</a>
      <a href="#" class="nav-item"><span class="ic">&#128203;</span> Orders</a>
      <a href="#" class="nav-item"><span class="ic">&#128101;</span> Customers</a>
      <a href="#" class="nav-item"><span class="ic">&#128179;</span> Payments</a>
    </nav>
    <nav class="nav-group">
      <p class="nav-label">Other</p>
      <a href="#" class="nav-item"><span class="ic">&#128450;</span> Catalogue</a>
      <a href="#" class="nav-item"><span class="ic">&#128230;</span> Stock</a>
      <a href="#" class="nav-item"><span class="ic">&#128202;</span> Analytics</a>
      <a href="#" class="nav-item"><span class="ic">&#9881;</span> Settings</a>
    </nav>
    <div class="team-card">
      <div class="team-info">
        <div class="team-avatar">RE</div>
        <div><p class="team-name">Central Team</p><p class="team-count">5 staff</p></div>
      </div>
      <span>&#8597;</span>
    </div>
  </aside>

  <!-- Main -->
  <main class="main-content">
    <header class="top-bar">
      <div class="breadcrumb">Dashboard</div>
      <div class="search-container">
        <span class="search-icon">&#128269;</span>
        <input type="text" placeholder="Search orders, customers..." class="search-input">
      </div>
      <div class="top-actions">
        <button class="icon-btn">&#128276;</button>
        <button class="icon-btn">&#9881;</button>
        <div class="user-profile"><div class="user-avatar">CT</div><span>Central Team</span><span>&#8964;</span></div>
      </div>
    </header>

    <div class="welcome-section">
      <div class="welcome-text"><h1>Welcome back!</h1><p>Today, 23 April 2026</p></div>
      <div class="filter-actions">
        <div class="dropdown-btn">&#128340; Last 30 days &#8964;</div>
        <button class="export-btn">Export &#8964;</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card dark">
        <div class="card-header"><span>Total Orders</span><span class="badge-pill">Today &#8964;</span></div>
        <div class="card-value">1,248</div>
        <div class="card-trend">&#8593; 12% from last month</div>
      </div>
      <div class="kpi-card">
        <div class="card-header"><span>Revenue</span><span class="badge-pill light">Today &#8964;</span></div>
        <div class="card-value">$84.2<span class="unit">k</span></div>
        <div class="card-trend">&#8593; 8% MoM</div>
      </div>
      <div class="kpi-card">
        <div class="card-header"><span>In Transit</span><span class="badge-pill light">Today &#8964;</span></div>
        <div class="card-value">36</div>
        <div class="card-trend">6 delivering today</div>
      </div>
      <div class="kpi-card">
        <div class="card-header"><span>Pending Payment</span><span class="badge-pill light">Today &#8964;</span></div>
        <div class="card-value">14</div>
        <div class="card-trend warn">3 overdue</div>
      </div>
    </div>

    <div class="middle-grid">
      <div class="chart-card">
        <div class="card-header-main"><h3>Order Status Breakdown</h3><span class="badge-pill light">This month &#8964;</span></div>
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
        <div class="card-header-main"><h3>Recent Activity</h3><span>&#8943;</span></div>
        <div class="activity-item"><span class="activity-badge new">New</span><span class="activity-text">Order DEF-902244 shipped</span><span class="activity-time">2h ago</span></div>
        <div class="activity-item"><span class="activity-badge new">New</span><span class="activity-text">Payment verified &mdash; King Bob</span><span class="activity-time">4h ago</span></div>
        <div class="activity-item"><span class="activity-badge done">Done</span><span class="activity-text">Order DEF-771203 delivered</span><span class="activity-time">Yesterday</span></div>
        <div class="activity-item"><span class="activity-badge new">New</span><span class="activity-text">New customer approved</span><span class="activity-time">Yesterday</span></div>
      </div>
    </div>

    <div class="table-card">
      <div class="card-header-main"><h3>Recent Orders</h3><button class="filter-btn">&#9881; Filter</button></div>
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

    <p class="foot">Design preview &middot; teal + lime &middot; Prodexa-inspired &middot; /design-preview</p>
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
