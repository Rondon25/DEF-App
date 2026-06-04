import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { setCustomerAuth } from "../../hooks/useAuth";

type Step = "phone" | "otp";

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [step, setStep]               = useState<Step>("phone");
  const [phone, setPhone]             = useState("");
  const [otp, setOtp]                 = useState(["", "", "", "", "", ""]);
  const channel = "whatsapp";
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [successMsg, setSuccessMsg]   = useState("");

  const cleanPhone = phone.replace(/\D/g, "");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanPhone) return;
    setError(""); setLoading(true);
    try {
      const res = await axios.post("/auth/send-otp", { phone_number: cleanPhone, otp_channel: channel });
      setSuccessMsg(res.data.message);
      setStep("otp");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) return;
    setError(""); setLoading(true);
    try {
      const res = await axios.post("/auth/verify-otp", { phone_number: cleanPhone, otp_code: code });
      setCustomerAuth(res.data.access_token, res.data.customer);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
      setOtp(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[index] = val.slice(-1);
    setOtp(next);
    if (val && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
    if (next.every(v => v) && next.join("").length === 6) {
      setTimeout(() => handleVerifyDirect(next.join("")), 50);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleVerifyDirect = async (code: string) => {
    setError(""); setLoading(true);
    try {
      const res = await axios.post("/auth/verify-otp", { phone_number: cleanPhone, otp_code: code });
      setCustomerAuth(res.data.access_token, res.data.customer);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
      setOtp(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">🧪</div>
          <h1>DEF Platform</h1>
          <p className="tagline">Customer Portal</p>
        </div>

        {step === "phone" ? (
          <>
            <p className="auth-title">Welcome back</p>
            <p className="auth-sub">Enter your phone number to receive a login code.</p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSendOTP}>
              <div className="form-group">
                <label>Phone number</label>
                <input
                  className="input"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="61412345678"
                  required
                />
                <p className="hint">Include country code. Digits only.</p>
              </div>


              <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading || !cleanPhone}>
                {loading ? <span className="spinner" /> : "Send code →"}
              </button>
            </form>

            <div className="divider">or</div>
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
              New customer?{" "}
              <Link to="/register" style={{ color: "var(--blue)", fontWeight: 600 }}>Create account</Link>
            </p>
            <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-4)", marginTop: 8 }}>
              Staff?{" "}
              <Link to="/staff/login" style={{ color: "var(--ink-4)" }}>Staff login →</Link>
            </p>
          </>
        ) : (
          <>
            <p className="auth-title">Enter your code</p>
            <p className="auth-sub">
              {successMsg || `Code sent to ${phone} via WhatsApp.`}
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="otp-grid">
              {otp.map((val, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  className={`otp-box ${val ? "filled" : ""}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={val}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                />
              ))}
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleVerify}
              disabled={loading || otp.join("").length < 6}
            >
              {loading ? <span className="spinner" /> : "Verify →"}
            </button>

            <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-3)", marginTop: 16 }}>
              Didn't get it?{" "}
              <button
                onClick={() => { setStep("phone"); setOtp(["","","","","",""]); setError(""); }}
                style={{ background: "none", border: "none", color: "var(--blue)", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
              >
                Change number
              </button>
              {" · "}
              <button
                onClick={() => handleSendOTP({ preventDefault: () => {} } as any)}
                style={{ background: "none", border: "none", color: "var(--blue)", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                disabled={loading}
              >
                Resend
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
