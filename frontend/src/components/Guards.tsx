import { Navigate, useLocation } from "react-router-dom";
import { isCustomerLoggedIn, getCustomerUser, isStaffLoggedIn, getStaffUser } from "../hooks/useAuth";

export function RequireCustomer({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isCustomerLoggedIn()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  const customer = getCustomerUser();
  if (customer?.status === "pending") {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Account Pending Approval</h2>
          <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>
            Your account is being reviewed by our team. You'll receive a WhatsApp message once approved.
          </p>
          <button className="btn btn-secondary" style={{ marginTop: 20 }}
            onClick={() => { localStorage.clear(); window.location.href = "/login"; }}>
            Sign out
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function RequireStaff({ roles, children }: { roles?: string[]; children: React.ReactNode }) {
  const location = useLocation();
  if (!isStaffLoggedIn()) {
    return <Navigate to="/staff/login" state={{ from: location }} replace />;
  }
  const user = getStaffUser();
  if (roles && user && !roles.includes(user.role)) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Access Denied</h2>
          <p style={{ fontSize: 13, color: "var(--ink-3)" }}>
            Your role <strong>{user.role}</strong> does not have access to this page.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
