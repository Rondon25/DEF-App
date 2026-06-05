import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { setStaffAuth } from "../../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, AlertCircle, Info } from "lucide-react";

const inputCls =
  "w-full h-11 rounded-xl border border-input bg-surface px-3.5 text-sm placeholder:text-ink-4 " +
  "outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function StaffLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    const expired = sessionStorage.getItem("session_expired") === "1";
    if (expired) sessionStorage.removeItem("session_expired");
    return expired ? "Your session expired. Please sign in again." : "";
  });

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
    <div className="min-h-dvh flex items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="flex flex-col items-center mb-7">
          <div className="size-14 rounded-2xl bg-sidebar flex items-center justify-center mb-3 shadow-[var(--shadow-sm)]">
            <Building2 className="size-7 text-accent" />
          </div>
          <h1 className="text-xl font-bold text-ink">Rohan Energy Solutions</h1>
          <p className="text-sm text-ink-3">Staff Portal</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-[var(--shadow)] p-6 sm:p-7">
          <h2 className="text-lg font-bold mb-1">Staff sign in</h2>
          <p className="text-sm text-ink-3 mb-5">Sign in with your staff email and password.</p>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-3.5 py-3 mb-5 text-[13px] text-red-700">
              <AlertCircle className="size-4 mt-px shrink-0" /><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Email address</label>
              <input className={inputCls} type="email" value={form.email} required
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="you@rohanenergy.com" />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Password</label>
              <input className={inputCls} type="password" value={form.password} required
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <Button type="submit" size="full" className="h-12" disabled={loading}>
              {loading ? <Loader2 className="size-5 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          {/* Dev credentials */}
          <div className="flex gap-2.5 rounded-xl bg-blue-50 border border-blue-100 px-3.5 py-3 mt-5 text-xs text-blue-800">
            <Info className="size-4 shrink-0 mt-px" />
            <div className="font-mono leading-relaxed">
              <div className="font-sans font-semibold mb-1">Dev credentials</div>
              admin@def.com / admin123<br />
              central@def.com / central123<br />
              finance@def.com / finance123<br />
              ops@def.com / ops123
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-ink-4 mt-5">
          Customer?{" "}
          <Link to="/login" className="text-ink-3 hover:text-ink font-medium">Customer login →</Link>
        </p>
      </div>
    </div>
  );
}
