import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

interface ExtraLocation {
  label: string;
  address: string;
  city: string;
  state: string;
}

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    phone_number: "", name: "", company_name: "",
    address: "", city: "", state: "",
  });
  const [extraLocations, setExtraLocations] = useState<ExtraLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const addLocation = () =>
    setExtraLocations(p => [...p, { label: "", address: "", city: "", state: "" }]);

  const updateLocation = (i: number, field: keyof ExtraLocation, value: string) =>
    setExtraLocations(p => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const removeLocation = (i: number) =>
    setExtraLocations(p => p.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const cleanPhone = form.phone_number.replace(/\D/g, "");
    try {
      await axios.post("/auth/register", {
        ...form,
        phone_number: cleanPhone,
        otp_channel: "whatsapp",
        additional_locations: extraLocations.map(l => ({
          label: l.label || "Factory Location",
          address: l.address || null,
          city: l.city || null,
          state: l.state || null,
        })),
      });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Registration Submitted!</h2>
          <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 24, lineHeight: 1.6 }}>
            Your account is pending approval. You'll receive a WhatsApp message once
            our team has reviewed and activated your account.
          </p>
          <button className="btn btn-primary btn-full" onClick={() => navigate("/login")}>
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ padding: "24px 16px" }}>
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">⚡</div>
          <h1>Rohan Energy Solutions</h1>
          <p className="tagline">Customer Portal</p>
        </div>

        <p className="auth-title">Create account</p>
        <p className="auth-sub">Fill in your details. Our team will review and activate your account.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Phone number *</label>
            <input className="input" name="phone_number" value={form.phone_number}
              onChange={handle} required inputMode="numeric" placeholder="919876543210" />
            <p className="hint">Include country code — digits only. e.g. 91XXXXXXXXXX</p>
          </div>

          <div className="form-group">
            <label>Full name *</label>
            <input className="input" name="name" value={form.name} onChange={handle} required placeholder="Jane Smith" />
          </div>

          <div className="form-group">
            <label>Company / Business name</label>
            <input className="input" name="company_name" value={form.company_name} onChange={handle} placeholder="Acme Transport Pty Ltd" />
          </div>

          {/* Main delivery location */}
          <div style={{ marginTop: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", letterSpacing: "0.05em" }}>
              MAIN DELIVERY LOCATION
            </div>
          </div>

          <div className="form-group">
            <label>Address</label>
            <input className="input" name="address" value={form.address} onChange={handle} placeholder="Plot 12, MIDC Industrial Area" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label>City</label>
              <input className="input" name="city" value={form.city} onChange={handle} placeholder="Mumbai" />
            </div>
            <div className="form-group">
              <label>State</label>
              <input className="input" name="state" value={form.state} onChange={handle} placeholder="Maharashtra" />
            </div>
          </div>

          {/* Additional factory locations */}
          {extraLocations.length > 0 && (
            <div style={{ marginTop: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", letterSpacing: "0.05em" }}>
                ADDITIONAL LOCATIONS
              </div>
            </div>
          )}

          {extraLocations.map((loc, i) => (
            <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, marginBottom: 12, background: "var(--surface-2, #f8f9fa)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>Location {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeLocation(i)}
                  style={{ background: "none", border: "none", color: "var(--red, #ef4444)", fontSize: 13, cursor: "pointer", padding: "2px 6px" }}
                >
                  Remove
                </button>
              </div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label>Location name</label>
                <input
                  className="input"
                  value={loc.label}
                  onChange={e => updateLocation(i, "label", e.target.value)}
                  placeholder="e.g. Factory A, Warehouse North"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label>Address</label>
                <input className="input" value={loc.address} onChange={e => updateLocation(i, "address", e.target.value)} placeholder="Plot 12, MIDC Industrial Area" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>City</label>
                  <input className="input" value={loc.city} onChange={e => updateLocation(i, "city", e.target.value)} placeholder="Pune" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>State</label>
                  <input className="input" value={loc.state} onChange={e => updateLocation(i, "state", e.target.value)} placeholder="Maharashtra" />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="btn btn-secondary btn-full"
            style={{ marginBottom: 16 }}
            onClick={addLocation}
          >
            + Add another delivery location
          </button>

          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Submit registration →"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-3)", marginTop: 16 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--blue)", fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
