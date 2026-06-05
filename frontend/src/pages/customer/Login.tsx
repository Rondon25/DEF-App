import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { setCustomerAuth } from "../../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Droplet, ArrowRight, Loader2, MessageCircle, AlertCircle } from "lucide-react";

type Step = "phone" | "otp";

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [step, setStep]             = useState<Step>("phone");
  const [phone, setPhone]           = useState("");
  const [otp, setOtp]               = useState(["", "", "", "", "", ""]);
  const channel = "whatsapp";
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(() => {
    const expired = sessionStorage.getItem("session_expired") === "1";
    if (expired) sessionStorage.removeItem("session_expired");
    return expired ? "Your session expired. Please log in again." : "";
  });
  const [successMsg, setSuccessMsg] = useState("");
  const [resendIn, setResendIn]     = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanPhone = phone.replace(/\D/g, "");

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    timerRef.current = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resendIn]);

  const startCooldown = () => setResendIn(30);

  const handleSendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!cleanPhone) return;
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      setError("Please enter a valid phone number with country code.");
      return;
    }
    setError(""); setLoading(true);
    try {
      const res = await axios.post("/auth/send-otp", { phone_number: cleanPhone, otp_channel: channel });
      setSuccessMsg(res.data.message);
      setStep("otp");
      startCooldown();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code: string) => {
    if (code.length < 6) return;
    setError(""); setLoading(true);
    try {
      const res = await axios.post("/auth/verify-otp", { phone_number: cleanPhone, otp_code: code });
      setCustomerAuth(res.data.access_token, res.data.customer);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
      setOtp(["", "", "", "", "", ""]);
      document.getElementById("otp-0")?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[index] = val.slice(-1);
    setOtp(next);
    if (val && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
    if (next.every((v) => v) && next.join("").length === 6) {
      setTimeout(() => verify(next.join("")), 50);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits.length) {
      e.preventDefault();
      const next = digits.split("").concat(Array(6).fill("")).slice(0, 6);
      setOtp(next);
      if (digits.length === 6) setTimeout(() => verify(digits), 50);
      else document.getElementById(`otp-${digits.length}`)?.focus();
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="flex flex-col items-center mb-7">
          <div className="size-14 rounded-2xl bg-sidebar flex items-center justify-center mb-3 shadow-[var(--shadow-sm)]">
            <Droplet className="size-7 text-accent" fill="currentColor" />
          </div>
          <h1 className="text-xl font-bold text-ink">Rohan Energy Solutions</h1>
          <p className="text-sm text-ink-3">Customer Portal</p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl shadow-[var(--shadow)] p-6 sm:p-7">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-3.5 py-3 mb-5 text-[13px] text-red-700">
              <AlertCircle className="size-4 mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === "phone" ? (
            <form onSubmit={handleSendOTP}>
              <h2 className="text-lg font-bold mb-1">Welcome back</h2>
              <p className="text-sm text-ink-3 mb-5">Enter your phone number to receive a login code.</p>

              <label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Phone number</label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="91XXXXXXXXXX"
                required
                className="w-full h-12 rounded-full border border-input bg-surface px-5 text-[15px] tracking-wide
                           placeholder:text-ink-4 transition-colors outline-none
                           focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-ink-4 mt-1.5 mb-5 flex items-center gap-1.5">
                <MessageCircle className="size-3.5 text-green-600" />
                Code sent via WhatsApp · include country code
              </p>

              <Button type="submit" size="full" className="h-12" disabled={loading || !cleanPhone}>
                {loading ? <Loader2 className="size-5 animate-spin" /> : <>Send code <ArrowRight className="size-4" /></>}
              </Button>

              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-line-2" />
                <span className="text-xs text-ink-4">or</span>
                <div className="h-px flex-1 bg-line-2" />
              </div>

              <p className="text-center text-[13px] text-ink-3">
                New customer?{" "}
                <Link to="/register" className="text-primary font-semibold hover:underline">Create account</Link>
              </p>
            </form>
          ) : (
            <div>
              <h2 className="text-lg font-bold mb-1">Enter your code</h2>
              <p className="text-sm text-ink-3 mb-6">
                {successMsg || `We sent a 6-digit code to ${phone} via WhatsApp.`}
              </p>

              <div className="flex gap-2 justify-between mb-6" onPaste={handlePaste}>
                {otp.map((val, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={`size-12 sm:size-[52px] text-center text-2xl font-bold rounded-xl border-2 bg-surface
                                outline-none transition-all
                                ${val ? "border-primary text-ink" : "border-input text-ink"}
                                focus:border-primary focus:ring-2 focus:ring-primary/20`}
                  />
                ))}
              </div>

              <Button onClick={() => verify(otp.join(""))} size="full" className="h-12" disabled={loading || otp.join("").length < 6}>
                {loading ? <Loader2 className="size-5 animate-spin" /> : <>Verify <ArrowRight className="size-4" /></>}
              </Button>

              <div className="flex items-center justify-center gap-3 mt-5 text-[13px]">
                <button
                  onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                  className="text-ink-3 font-medium hover:text-ink"
                >
                  Change number
                </button>
                <span className="text-line-2">·</span>
                {resendIn > 0 ? (
                  <span className="text-ink-4">Resend in {resendIn}s</span>
                ) : (
                  <button onClick={() => handleSendOTP()} disabled={loading} className="text-primary font-semibold hover:underline">
                    Resend code
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Staff link */}
        <p className="text-center text-xs text-ink-4 mt-5">
          Staff member?{" "}
          <Link to="/staff/login" className="text-ink-3 hover:text-ink font-medium">Staff login →</Link>
        </p>
      </div>
    </div>
  );
}
