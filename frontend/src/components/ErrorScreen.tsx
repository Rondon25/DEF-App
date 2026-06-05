import { useNavigate } from "react-router-dom";

interface Props {
  title?: string;
  message?: string;
  retry?: () => void;
  back?: boolean;
}

export default function ErrorScreen({
  title = "Something went wrong",
  message = "Please try again or contact support.",
  retry,
  back = false,
}: Props) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 40, textAlign: "center", minHeight: 200,
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
      <div style={{ display: "flex", gap: 8 }}>
        {retry && (
          <button className="btn btn-primary" onClick={retry}>Try again</button>
        )}
        {back && (
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Go back</button>
        )}
      </div>
    </div>
  );
}

export function SessionExpiredScreen() {
  const navigate = useNavigate();
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Session Expired</h2>
        <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 24, lineHeight: 1.6 }}>
          Your session has expired for security. Please log in again.
        </p>
        <button className="btn btn-primary btn-full" onClick={() => navigate("/login")}>
          Log in again
        </button>
      </div>
    </div>
  );
}
