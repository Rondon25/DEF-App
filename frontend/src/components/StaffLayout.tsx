import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { clearStaffAuth, getStaffUser } from "../hooks/useAuth";
import { staffApi } from "../api";
import {
  LayoutDashboard, Users, ClipboardList, CreditCard, Layers,
  Package, BarChart3, Droplet, Menu, X, LogOut, Bell,
} from "lucide-react";

type NavItem = { to: string; icon: any; label: string };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { to: "/staff",           icon: LayoutDashboard, label: "Dashboard" },
    { to: "/staff/customers", icon: Users,           label: "Customers" },
    { to: "/staff/orders",    icon: ClipboardList,   label: "Orders" },
    { to: "/staff/payments",  icon: CreditCard,      label: "Payments" },
    { to: "/staff/catalog",   icon: Layers,          label: "Catalogue" },
    { to: "/staff/stock",     icon: Package,         label: "Stock" },
    { to: "/staff/analytics", icon: BarChart3,       label: "Analytics" },
  ],
  central_team: [
    { to: "/staff",           icon: LayoutDashboard, label: "Dashboard" },
    { to: "/staff/customers", icon: Users,           label: "Customers" },
    { to: "/staff/orders",    icon: ClipboardList,   label: "Orders" },
    { to: "/staff/payments",  icon: CreditCard,      label: "Payments" },
    { to: "/staff/catalog",   icon: Layers,          label: "Catalogue" },
    { to: "/staff/analytics", icon: BarChart3,       label: "Analytics" },
  ],
  finance: [
    { to: "/staff",          icon: LayoutDashboard, label: "Dashboard" },
    { to: "/staff/payments", icon: CreditCard,      label: "Payments" },
    { to: "/staff/orders",   icon: ClipboardList,   label: "Orders" },
  ],
  operations: [
    { to: "/staff",        icon: LayoutDashboard, label: "Dashboard" },
    { to: "/staff/orders", icon: ClipboardList,   label: "Orders" },
    { to: "/staff/stock",  icon: Package,         label: "Stock" },
  ],
  sales: [
    { to: "/staff",           icon: LayoutDashboard, label: "Dashboard" },
    { to: "/staff/customers", icon: Users,           label: "Customers" },
    { to: "/staff/orders",    icon: ClipboardList,   label: "Orders" },
    { to: "/staff/analytics", icon: BarChart3,       label: "Analytics" },
  ],
};

const ROLE_COLOR: Record<string, string> = {
  admin: "#a78bfa", central_team: "#5eead4", finance: "#86efac",
  operations: "#fcd34d", sales: "#67e8f9",
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const user = getStaffUser();
  const nav = NAV_BY_ROLE[user?.role || "sales"] || NAV_BY_ROLE.sales;
  const roleColor = ROLE_COLOR[user?.role || "sales"] || "#5eead4";
  const [open, setOpen] = useState(false);

  // Live count of customers awaiting approval (for the nav badge)
  const canSeeCustomers = ["admin", "central_team", "sales"].includes(user?.role || "");
  const { data: pending = [] } = useQuery({
    queryKey: ["pending-customers"],
    queryFn: () => staffApi.get("/customers/pending").then((r) => r.data),
    enabled: canSeeCustomers,
    refetchInterval: 30_000,
  });
  const pendingCount = pending.length;

  const Sidebar = (
    <div className="h-full flex flex-col p-5">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8 px-1">
        <div className="size-9 rounded-xl bg-accent flex items-center justify-center text-sidebar shrink-0">
          <Droplet className="size-5" fill="currentColor" />
        </div>
        <div className="leading-tight">
          <div className="font-bold text-accent text-[15px]">Rohan Energy</div>
          <div className="text-[10px] text-white/40">Staff Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 px-3 mb-3">Navigation</div>
        {nav.map((n) => {
          const Icon = n.icon;
          const showBadge = n.to === "/staff/customers" && pendingCount > 0;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/staff"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-full px-4 py-2.5 mb-1 text-sm transition-colors ${
                  isActive
                    ? "bg-accent text-sidebar font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white font-medium"
                }`
              }
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="flex-1">{n.label}</span>
              {showBadge && (
                <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User card */}
      {user && (
        <div className="rounded-2xl bg-sidebar-accent p-3 mt-3">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="size-9 rounded-full bg-accent text-sidebar flex items-center justify-center text-xs font-bold shrink-0">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-white text-[13px] font-semibold truncate">{user.name}</div>
              <div className="text-[11px] font-semibold capitalize" style={{ color: roleColor }}>
                {user.role.replace("_", " ")}
              </div>
            </div>
          </div>
          <button
            onClick={() => { clearStaffAuth(); navigate("/staff/login"); }}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-full bg-white/10 text-white/70 text-xs font-medium hover:bg-white/15 hover:text-white transition-colors"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Desktop sidebar (fixed) + Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-[260px] bg-sidebar z-50 transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {Sidebar}
        <button onClick={() => setOpen(false)} className="md:hidden absolute top-4 right-4 text-white/60">
          <X className="size-5" />
        </button>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setOpen(false)} />}

      {/* Main column */}
      <div className="md:ml-[260px] flex flex-col min-h-dvh">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-border h-16 flex items-center justify-between gap-4 px-4 md:px-8">
          <button onClick={() => setOpen(true)} className="md:hidden text-ink-3">
            <Menu className="size-6" />
          </button>
          <div className="hidden md:block text-sm font-semibold text-ink-3 capitalize">
            {user?.name ? `Welcome, ${user.name.split(" ")[0]}` : "Staff Portal"}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {canSeeCustomers && (
              <button
                onClick={() => navigate("/staff/customers")}
                className="relative text-ink-3 hover:text-ink transition-colors"
                title={pendingCount > 0 ? `${pendingCount} customer(s) awaiting approval` : "No new approvals"}
              >
                <Bell className="size-5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
            <div className="flex items-center gap-2 bg-sidebar text-white pl-1.5 pr-4 py-1.5 rounded-full text-[13px]">
              <div className="size-7 rounded-full bg-accent text-sidebar flex items-center justify-center text-xs font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span className="hidden sm:inline">{user?.name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full">{children}</main>
      </div>
    </div>
  );
}
