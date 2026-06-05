import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import BulkLocationUpload, { type LocationRow } from "../../components/BulkLocationUpload";
import { Button } from "@/components/ui/button";
import { Droplet, ArrowRight, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Plus, Upload, X, MapPin } from "lucide-react";

interface ExtraLocation { label: string; address: string; city: string; state: string; }

const inputCls =
  "w-full h-11 rounded-xl border border-input bg-surface px-3.5 text-sm placeholder:text-ink-4 " +
  "outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelCls = "text-[13px] font-semibold text-ink-2 mb-1.5 block";

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone_number: "", name: "", company_name: "", address: "", city: "", state: "" });
  const [extraLocations, setExtraLocations] = useState<ExtraLocation[]>([]);
  const [showBulk, setShowBulk] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const addLocation = () => setExtraLocations((p) => [...p, { label: "", address: "", city: "", state: "" }]);
  const updateLocation = (i: number, field: keyof ExtraLocation, value: string) =>
    setExtraLocations((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  const removeLocation = (i: number) => setExtraLocations((p) => p.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const cleanPhone = form.phone_number.replace(/\D/g, "");

    if (cleanPhone.length < 8 || cleanPhone.length > 15) { setError("Please enter a valid phone number with country code (8–15 digits)."); setLoading(false); return; }
    if (form.name.trim().length < 2)   { setError("Please enter your full name (at least 2 characters)."); setLoading(false); return; }
    if (form.name.trim().length > 200) { setError("Name is too long (max 200 characters)."); setLoading(false); return; }
    if (form.company_name && form.company_name.length > 200) { setError("Company name is too long (max 200 characters)."); setLoading(false); return; }

    try {
      await axios.post("/auth/register", {
        ...form, phone_number: cleanPhone, otp_channel: "whatsapp",
        additional_locations: extraLocations.map((l) => ({
          label: l.label || "Factory Location", address: l.address || null, city: l.city || null, state: l.state || null,
        })),
      });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success ──
  if (done) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-canvas px-4 py-8">
        <div className="w-full max-w-[400px] bg-surface rounded-2xl shadow-[var(--shadow)] p-8 text-center">
          <div className="size-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="size-9 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Registration submitted!</h2>
          <p className="text-sm text-ink-3 leading-relaxed mb-6">
            Your account is pending approval. You'll receive a WhatsApp message once our team has
            reviewed and activated your account.
          </p>
          <Button size="full" className="h-12" onClick={() => navigate("/login")}>Go to login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas px-4 py-8">
      <div className="w-full max-w-[440px] mx-auto">
        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="size-14 rounded-2xl bg-sidebar flex items-center justify-center mb-3 shadow-[var(--shadow-sm)]">
            <Droplet className="size-7 text-accent" fill="currentColor" />
          </div>
          <h1 className="text-xl font-bold text-ink">Rohan Energy Solutions</h1>
          <p className="text-sm text-ink-3">Customer Portal</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-[var(--shadow)] p-6 sm:p-7">
          <h2 className="text-lg font-bold mb-1">Create account</h2>
          <p className="text-sm text-ink-3 mb-5">Fill in your details. Our team will review and activate your account.</p>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-3.5 py-3 mb-5 text-[13px] text-red-700">
              <AlertCircle className="size-4 mt-px shrink-0" /><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Phone number *</label>
              <input className={inputCls} name="phone_number" value={form.phone_number} onChange={handle} required inputMode="numeric" placeholder="91XXXXXXXXXX" />
              <p className="text-xs text-ink-4 mt-1.5">Include country code — digits only.</p>
            </div>
            <div>
              <label className={labelCls}>Full name *</label>
              <input className={inputCls} name="name" value={form.name} onChange={handle} required placeholder="Jane Smith" />
            </div>
            <div>
              <label className={labelCls}>Company / Business name</label>
              <input className={inputCls} name="company_name" value={form.company_name} onChange={handle} placeholder="Acme Transport Pvt Ltd" />
            </div>

            {/* Main location */}
            <div className="pt-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-4 mb-2.5">Main Delivery Location</div>
              <label className={labelCls}>Address</label>
              <input className={inputCls} name="address" value={form.address} onChange={handle} placeholder="Plot 12, MIDC Industrial Area" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div><label className={labelCls}>City</label><input className={inputCls} name="city" value={form.city} onChange={handle} placeholder="Mumbai" /></div>
                <div><label className={labelCls}>State</label><input className={inputCls} name="state" value={form.state} onChange={handle} placeholder="Maharashtra" /></div>
              </div>
            </div>

            {/* Extra locations */}
            {extraLocations.length > 0 && (
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-4 pt-1">Additional Locations</div>
            )}
            {extraLocations.map((loc, i) => (
              <div key={i} className="rounded-xl border border-border bg-canvas p-3.5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-semibold text-ink-2 flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" /> Location {i + 1}
                  </span>
                  <button type="button" onClick={() => removeLocation(i)} className="text-red-500 hover:text-red-600 p-1">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  <input className={inputCls} value={loc.label} onChange={(e) => updateLocation(i, "label", e.target.value)} placeholder="Location name (e.g. Factory A)" />
                  <input className={inputCls} value={loc.address} onChange={(e) => updateLocation(i, "address", e.target.value)} placeholder="Address" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input className={inputCls} value={loc.city} onChange={(e) => updateLocation(i, "city", e.target.value)} placeholder="City" />
                    <input className={inputCls} value={loc.state} onChange={(e) => updateLocation(i, "state", e.target.value)} placeholder="State" />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-2.5">
              <Button type="button" variant="secondary" className="flex-1" onClick={addLocation}>
                <Plus className="size-4" /> Add manually
              </Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowBulk(true)}>
                <Upload className="size-4" /> Upload CSV/Excel
              </Button>
            </div>

            <Button type="submit" size="full" className="h-12 mt-1" disabled={loading}>
              {loading ? <Loader2 className="size-5 animate-spin" /> : <>Submit registration <ArrowRight className="size-4" /></>}
            </Button>
          </form>

          <p className="text-center text-[13px] text-ink-3 mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="size-3.5" /> Sign in
            </Link>
          </p>
        </div>
      </div>

      {showBulk && (
        <BulkLocationUpload
          onClose={() => setShowBulk(false)}
          onLocations={(rows: LocationRow[]) => {
            setExtraLocations((prev) => [...prev, ...rows.map((r) => ({ label: r.label, address: r.address, city: r.city, state: r.state }))]);
            setShowBulk(false);
          }}
        />
      )}
    </div>
  );
}
