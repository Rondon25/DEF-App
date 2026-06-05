import { NavLink } from "react-router-dom";
import { getCustomerUser } from "../hooks/useAuth";
import { Droplet, Home, ShoppingCart, Package, User } from "lucide-react";

const NAV = [
  { to: "/",        icon: Home,         label: "Home"    },
  { to: "/catalog", icon: ShoppingCart, label: "Order"   },
  { to: "/orders",  icon: Package,      label: "Orders"  },
  { to: "/profile", icon: User,         label: "Profile" },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const customer = getCustomerUser();
  const initial = customer?.name?.[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-sidebar flex items-center justify-center">
              <Droplet className="size-4 text-accent" fill="currentColor" />
            </div>
            <span className="font-bold text-[15px] text-ink">Rohan Energy</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-ink-3 hidden sm:block">{customer?.name}</span>
            <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
              {initial}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-5 pb-28">
        {children}
      </main>

      {/* Bottom tab nav */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-2xl mx-auto flex">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                    isActive ? "text-primary" : "text-ink-4 hover:text-ink-3"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex items-center justify-center size-9 rounded-full transition-colors ${isActive ? "bg-accent" : ""}`}>
                      <Icon className={`size-[19px] ${isActive ? "text-sidebar" : ""}`} strokeWidth={isActive ? 2.4 : 2} />
                    </span>
                    {n.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
