import { NavLink, useNavigate } from "react-router-dom";
import { clearStaffAuth, getStaffUser } from "../hooks/useAuth";

const NAV_BY_ROLE: Record<string, { to: string; emoji: string; label: string }[]> = {
  admin: [
    { to: "/staff",            emoji: "📊", label: "Dashboard"   },
    { to: "/staff/customers",  emoji: "👥", label: "Customers"   },
    { to: "/staff/orders",     emoji: "📋", label: "Orders"      },
    { to: "/staff/payments",   emoji: "💳", label: "Payments"    },
    { to: "/staff/catalog",    emoji: "🗂️",  label: "Catalogue"  },
    { to: "/staff/stock",      emoji: "📦", label: "Stock"       },
    { to: "/staff/analytics",  emoji: "📈", label: "Analytics"   },
  ],
  central_team: [
    { to: "/staff",            emoji: "📊", label: "Dashboard"   },
    { to: "/staff/customers",  emoji: "👥", label: "Customers"   },
    { to: "/staff/orders",     emoji: "📋", label: "Orders"      },
    { to: "/staff/payments",   emoji: "💳", label: "Payments"    },
    { to: "/staff/catalog",    emoji: "🗂️",  label: "Catalogue"  },
    { to: "/staff/analytics",  emoji: "📈", label: "Analytics"   },
  ],
  finance: [
    { to: "/staff",            emoji: "📊", label: "Dashboard"   },
    { to: "/staff/payments",   emoji: "💳", label: "Payments"    },
    { to: "/staff/orders",     emoji: "📋", label: "Orders"      },
  ],
  operations: [
    { to: "/staff",            emoji: "📊", label: "Dashboard"   },
    { to: "/staff/orders",     emoji: "📋", label: "Orders"      },
    { to: "/staff/stock",      emoji: "📦", label: "Stock"       },
  ],
  sales: [
    { to: "/staff",            emoji: "📊", label: "Dashboard"   },
    { to: "/staff/customers",  emoji: "👥", label: "Customers"   },
    { to: "/staff/orders",     emoji: "📋", label: "Orders"      },
    { to: "/staff/analytics",  emoji: "📈", label: "Analytics"   },
  ],
};

const ROLE_COLOR: Record<string, string> = {
  admin:        "#7C3AED",
  central_team: "#2563EB",
  finance:      "#16A34A",
  operations:   "#D97706",
  sales:        "#0891B2",
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const user     = getStaffUser();
  const nav      = NAV_BY_ROLE[user?.role || "sales"] || NAV_BY_ROLE.sales;
  const roleColor = ROLE_COLOR[user?.role || "sales"] || "var(--blue)";

  return (
    <div className="app-shell">
      {/* Mobile header */}
      <header className="mobile-header">
        <h2>🏭 DEF Staff</h2>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)", textTransform: "capitalize" }}>
          {user?.role?.replace("_", " ")}
        </span>
      </header>

      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>DEF Platform</h2>
          <span>Staff Portal</span>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>
          <nav className="sidebar-nav">
            {nav.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === "/staff"} className={({ isActive }) => isActive ? "active" : ""}>
                <span className="nav-icon">{n.emoji}</span>{n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        {user && (
          <div className="sidebar-user">
            <div className="user-name">{user.name}</div>
            <div className="user-role" style={{ color: roleColor, fontWeight: 600 }}>
              {user.role.replace("_", " ")}
            </div>
            <button className="btn-logout" onClick={() => { clearStaffAuth(); navigate("/staff/login"); }}>
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="page-content">{children}</div>
      </main>

      {/* Bottom nav (mobile — only show first 4) */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {nav.slice(0, 4).map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === "/staff"} className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}>
              <span className="nav-emoji">{n.emoji}</span>
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
