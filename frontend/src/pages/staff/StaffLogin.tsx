import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { setStaffAuth } from "../../hooks/useAuth";

export default function StaffLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await axios.post("/staff/login", form);
      setStaffAuth(res.data.access_token, res.data.user);
      navigate("/staff");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">🏭</div>
          <h1>DEF Platform</h1>
          <p className="tagline">Staff Portal</p>
        </div>

        <p className="auth-title">Staff login</p>
        <p className="auth-sub">Sign in with your staff email and password.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email address</label>
            <input className="input" type="email" value={form.email} required
              onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="you@def.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="input" type="password" value={form.password} required
              onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••" />
          </div>
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Sign in"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-4)", marginTop: 20 }}>
          Customer portal?{" "}
          <Link to="/login" style={{ color: "var(--ink-4)" }}>Customer login →</Link>
        </p>

        <div className="alert alert-info" style={{ marginTop: 16, fontSize: 12 }}>
          <strong>Dev credentials:</strong><br />
          admin@def.com / admin123<br />
          central@def.com / central123<br />
          finance@def.com / finance123<br />
          ops@def.com / ops123
        </div>
      </div>
    </div>
  );
}
