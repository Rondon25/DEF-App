import { NavLink, useNavigate } from "react-router-dom";
import { clearCustomerAuth, getCustomerUser } from "../hooks/useAuth";

const NAV = [
  { to: "/",         emoji: "🏠", label: "Home"    },
  { to: "/catalog",  emoji: "🛒", label: "Order"   },
  { to: "/orders",   emoji: "📦", label: "Orders"  },
  { to: "/profile",  emoji: "👤", label: "Profile" },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const navigate  = useNavigate();
  const customer  = getCustomerUser();

  return (
    <div className="app-shell" style={{ flexDirection: "column" }}>
      {/* Mobile header */}
      <header className="mobile-header">
        <h2>⚡ Rohan Energy</h2>
        <div className="header-right">
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>{customer?.name}</span>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>Rohan Energy Solutions</h2>
          <span>Customer Portal</span>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-label">Menu</div>
          <nav className="sidebar-nav">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => isActive ? "active" : ""}>
                <span className="nav-icon">{n.emoji}</span>{n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        {customer && (
          <div className="sidebar-user">
            <div className="user-name">{customer.name}</div>
            <div className="user-role">{customer.company_name || "Customer"}</div>
            <button className="btn-logout" onClick={() => { clearCustomerAuth(); navigate("/login"); }}>
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="page-content">{children}</div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}>
              <span className="nav-emoji">{n.emoji}</span>
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
