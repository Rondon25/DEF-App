import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import { getCustomerUser, setCustomerAuth, clearCustomerAuth, getCustomerToken } from "../../hooks/useAuth";
import type { DeliveryLocation } from "../../hooks/useAuth";
import BulkLocationUpload, { type LocationRow } from "../../components/BulkLocationUpload";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  FolderOpen, Smartphone, X, MapPin, Plus, Pencil, Trash2, LogOut, Loader2, Check, CreditCard, Phone,
} from "lucide-react";

const SUPPORT_PHONE = "+91 9370494639";
const SUPPORT_TEL   = "+919370494639";

interface LocationForm { label: string; address: string; city: string; state: string; }
const emptyForm = (): LocationForm => ({ label: "", address: "", city: "", state: "" });

const inputCls = "w-full h-11 rounded-xl border border-input bg-surface px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-4";

export default function Profile() {
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const customer = getCustomerUser();

  const [name,    setName]    = useState(customer?.name || "");
  const [company, setCompany] = useState(customer?.company_name || "");
  const [address, setAddress] = useState(customer?.address || "");
  const [city,    setCity]    = useState(customer?.city || "");
  const [state,   setState]   = useState(customer?.state || "");
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  const [showPhoneChange, setShowPhoneChange] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"enter"|"verify">("enter");
  const [phoneMsg, setPhoneMsg] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);

  const [addingLoc, setAddingLoc] = useState(false);
  const [showBulk,  setShowBulk]  = useState(false);
  const [newLoc,    setNewLoc]    = useState<LocationForm>(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLoc,   setEditLoc]   = useState<LocationForm>(emptyForm());
  const [locError,  setLocError]  = useState("");
  const [delLoc,    setDelLoc]    = useState<DeliveryLocation | null>(null);

  const { data: locations = [], isLoading: locsLoading } = useQuery<DeliveryLocation[]>({
    queryKey: ["my-locations"],
    queryFn: () => api.get("/auth/me/locations").then(r => r.data),
  });

  const profileMutation = useMutation({
    mutationFn: (body: any) => api.patch("/auth/me", body).then(r => r.data),
    onSuccess: (updated) => {
      setCustomerAuth(getCustomerToken()!, updated);
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      setSuccess(true); setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: any) => setError(err.response?.data?.detail || "Update failed"),
  });
  const addLocMutation = useMutation({
    mutationFn: (body: LocationForm) => api.post("/auth/me/locations", { label: body.label || "Factory Location", address: body.address || null, city: body.city || null, state: body.state || null }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-locations"] }); setNewLoc(emptyForm()); setAddingLoc(false); setLocError(""); },
    onError: (err: any) => setLocError(err.response?.data?.detail || "Failed to add location"),
  });
  const editLocMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: LocationForm }) => api.patch(`/auth/me/locations/${id}`, { label: body.label || "Factory Location", address: body.address || null, city: body.city || null, state: body.state || null }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-locations"] }); setEditingId(null); setLocError(""); },
    onError: (err: any) => setLocError(err.response?.data?.detail || "Failed to update location"),
  });
  const deleteLocMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/auth/me/locations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-locations"] }); setDelLoc(null); },
    onError: (err: any) => setLocError(err.response?.data?.detail || "Failed to delete location"),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(false);
    profileMutation.mutate({ name, company_name: company, address, city, state });
  };
  const startEdit = (loc: DeliveryLocation) => {
    setEditingId(loc.id);
    setEditLoc({ label: loc.label, address: loc.address || "", city: loc.city || "", state: loc.state || "" });
    setLocError("");
  };

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-ink">My Profile</h1>
        <p className="text-sm text-ink-3 font-mono">{customer?.phone_number}</p>
      </div>

      {/* Profile card */}
      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-4 mb-4 flex items-center gap-4">
        <div className="size-14 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold shrink-0">{customer?.name?.[0]?.toUpperCase() || "?"}</div>
        <div className="min-w-0">
          <div className="font-bold text-[16px] truncate">{customer?.name}</div>
          <div className="text-[13px] text-ink-3 truncate">{customer?.company_name || "Customer"}</div>
          <div className="text-[12px] text-ink-4 mt-0.5 inline-flex items-center gap-1"><CreditCard className="size-3" /> {customer?.is_credit_account ? "Credit account" : "Cash account"}</div>
        </div>
      </div>

      {/* Edit details */}
      <form onSubmit={handleSave} className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-4 mb-4">
        <h3 className="font-bold text-[14px] mb-4">Edit Details</h3>
        <Field label="Full name"><input className={inputCls} value={name} onChange={e => setName(e.target.value)} required /></Field>
        <Field label="Company name"><input className={inputCls} value={company} onChange={e => setCompany(e.target.value)} placeholder="Optional" /></Field>
        <div className="text-[11px] font-bold uppercase tracking-wide text-ink-4 mb-2 mt-1">Main Delivery Address</div>
        <Field label="Address"><input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} placeholder="Plot 12, MIDC Industrial Area" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City"><input className={inputCls} value={city} onChange={e => setCity(e.target.value)} placeholder="Mumbai" /></Field>
          <Field label="State"><input className={inputCls} value={state} onChange={e => setState(e.target.value)} placeholder="Maharashtra" /></Field>
        </div>
        {error && <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 mb-3 text-[13px] text-red-700">{error}</div>}
        {success && <div className="rounded-xl bg-green-50 border border-green-200 px-3.5 py-2.5 mb-3 text-[13px] text-green-700 inline-flex items-center gap-1.5"><Check className="size-4" /> Profile updated</div>}
        <button type="submit" disabled={profileMutation.isPending} className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-colors disabled:opacity-60">
          {profileMutation.isPending ? <Loader2 className="size-5 animate-spin" /> : "Save changes"}
        </button>
      </form>

      {/* Delivery locations */}
      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[14px]">Additional Delivery Locations</h3>
          {!addingLoc && (
            <div className="flex gap-2">
              <button onClick={() => setShowBulk(true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border text-[12px] font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors"><FolderOpen className="size-3.5" /> Bulk</button>
              <button onClick={() => { setAddingLoc(true); setLocError(""); }} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-primary text-white text-[12px] font-semibold hover:bg-teal-700 transition-colors"><Plus className="size-3.5" /> Add</button>
            </div>
          )}
        </div>

        {locError && <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 mb-3 text-[13px] text-red-700">{locError}</div>}

        {locsLoading ? (
          <div className="py-3 flex justify-center"><Loader2 className="size-5 animate-spin text-primary" /></div>
        ) : locations.length === 0 && !addingLoc ? (
          <p className="text-[13px] text-ink-4 text-center py-3">No additional locations yet</p>
        ) : locations.map(loc => (
          <div key={loc.id} className="border-b border-border last:border-0 py-3 first:pt-0">
            {editingId === loc.id ? (
              <div>
                <Field label="Location name"><input className={inputCls} value={editLoc.label} onChange={e => setEditLoc(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Factory A" /></Field>
                <Field label="Address"><input className={inputCls} value={editLoc.address} onChange={e => setEditLoc(p => ({ ...p, address: e.target.value }))} placeholder="Plot 12, MIDC Industrial Area" /></Field>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">City</label><input className={inputCls} value={editLoc.city} onChange={e => setEditLoc(p => ({ ...p, city: e.target.value }))} placeholder="Mumbai" /></div>
                  <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">State</label><input className={inputCls} value={editLoc.state} onChange={e => setEditLoc(p => ({ ...p, state: e.target.value }))} placeholder="Maharashtra" /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editLocMutation.mutate({ id: loc.id, body: editLoc })} disabled={editLocMutation.isPending} className="flex-1 h-10 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center hover:bg-teal-700 transition-colors disabled:opacity-60">{editLocMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}</button>
                  <button onClick={() => setEditingId(null)} className="flex-1 h-10 rounded-full border border-border text-sm font-semibold text-ink-2 hover:bg-canvas transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm flex items-center gap-1.5"><MapPin className="size-3.5 text-primary shrink-0" /> {loc.label}</div>
                  {loc.address && <div className="text-[13px] text-ink-3 mt-0.5">{loc.address}</div>}
                  {(loc.city || loc.state) && <div className="text-[13px] text-ink-3">{[loc.city, loc.state].filter(Boolean).join(", ")}</div>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => startEdit(loc)} className="size-8 rounded-full border border-border flex items-center justify-center text-ink-4 hover:border-primary hover:text-primary transition-colors"><Pencil className="size-3.5" /></button>
                  <button onClick={() => setDelLoc(loc)} className="size-8 rounded-full border border-border flex items-center justify-center text-ink-4 hover:border-red-300 hover:text-red-600 transition-colors"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            )}
          </div>
        ))}

        {addingLoc && (
          <div className={locations.length > 0 ? "border-t border-border pt-3 mt-1" : ""}>
            <div className="font-semibold text-[13px] mb-3">New Location</div>
            <Field label="Location name"><input className={inputCls} value={newLoc.label} onChange={e => setNewLoc(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Factory A, Warehouse North" /></Field>
            <Field label="Address"><input className={inputCls} value={newLoc.address} onChange={e => setNewLoc(p => ({ ...p, address: e.target.value }))} placeholder="Plot 12, MIDC Industrial Area" /></Field>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">City</label><input className={inputCls} value={newLoc.city} onChange={e => setNewLoc(p => ({ ...p, city: e.target.value }))} placeholder="Mumbai" /></div>
              <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">State</label><input className={inputCls} value={newLoc.state} onChange={e => setNewLoc(p => ({ ...p, state: e.target.value }))} placeholder="Maharashtra" /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => addLocMutation.mutate(newLoc)} disabled={addLocMutation.isPending} className="flex-1 h-10 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center hover:bg-teal-700 transition-colors disabled:opacity-60">{addLocMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save location"}</button>
              <button onClick={() => { setAddingLoc(false); setNewLoc(emptyForm()); }} className="flex-1 h-10 rounded-full border border-border text-sm font-semibold text-ink-2 hover:bg-canvas transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Contact / help */}
      <a href={`tel:${SUPPORT_TEL}`} className="block bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-4 mb-4 hover:bg-canvas transition-colors">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-teal-50 text-primary flex items-center justify-center shrink-0"><Phone className="size-5" /></div>
          <div className="min-w-0">
            <div className="font-semibold text-sm">Contact Rohan Energy</div>
            <div className="text-[13px] text-ink-3">Need help with an order? Call us</div>
            <div className="text-[13px] font-semibold text-primary font-mono mt-0.5">{SUPPORT_PHONE}</div>
          </div>
        </div>
      </a>

      {/* Account actions */}
      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-4 space-y-2.5">
        <button onClick={() => { setShowPhoneChange(true); setPhoneStep("enter"); setPhoneErr(""); setNewPhone(""); setPhoneOtp(""); }} className="w-full h-11 rounded-full border border-border text-sm font-semibold text-ink-2 hover:bg-canvas transition-colors flex items-center justify-center gap-1.5"><Smartphone className="size-4" /> Change phone number</button>
        <button onClick={() => { clearCustomerAuth(); navigate("/login"); }} className="w-full h-11 rounded-full border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"><LogOut className="size-4" /> Sign out</button>
      </div>

      {showBulk && (
        <BulkLocationUpload onClose={() => setShowBulk(false)} onLocations={async (rows: LocationRow[]) => {
          for (const row of rows) { await api.post("/auth/me/locations", { label: row.label, address: row.address || null, city: row.city || null, state: row.state || null }).catch(() => {}); }
          qc.invalidateQueries({ queryKey: ["my-locations"] }); setShowBulk(false);
        }} />
      )}

      {delLoc && (
        <ConfirmDialog title="Delete location?" message={<>Remove <strong>{delLoc.label}</strong> from your delivery locations?</>} confirmLabel="Delete" loading={deleteLocMutation.isPending} onConfirm={() => deleteLocMutation.mutate(delLoc.id)} onCancel={() => setDelLoc(null)} />
      )}

      {/* Phone change modal */}
      {showPhoneChange && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-end sm:items-center sm:justify-center" onClick={() => setShowPhoneChange(false)}>
          <div className="bg-surface w-full sm:max-w-[440px] rounded-t-2xl sm:rounded-2xl p-6" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">Change Phone Number</h3><button onClick={() => setShowPhoneChange(false)} className="text-ink-3"><X className="size-5" /></button></div>
            {phoneStep === "enter" ? (
              <>
                <p className="text-[13px] text-ink-3 mb-3">We'll send a WhatsApp OTP to your new number to confirm.</p>
                <Field label="New phone number"><input className={inputCls} type="tel" inputMode="numeric" placeholder="919876543210" value={newPhone} onChange={e => setNewPhone(e.target.value.replace(/\D/g, ""))} /></Field>
                <p className="text-[12px] text-ink-4 -mt-1 mb-3">Include country code. Digits only.</p>
                {phoneErr && <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 mb-3 text-[13px] text-red-700">{phoneErr}</div>}
                <button className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center hover:bg-teal-700 transition-colors disabled:opacity-60" disabled={phoneLoading || newPhone.length < 8}
                  onClick={async () => { setPhoneErr(""); setPhoneLoading(true); try { const r = await api.post("/auth/request-phone-change", { new_phone: newPhone }); setPhoneMsg(r.data.message); setPhoneStep("verify"); } catch (e: any) { setPhoneErr(e.response?.data?.detail || "Failed to send OTP"); } finally { setPhoneLoading(false); } }}>
                  {phoneLoading ? <Loader2 className="size-5 animate-spin" /> : "Send OTP"}
                </button>
              </>
            ) : (
              <>
                <p className="text-[13px] text-ink-3 mb-3">{phoneMsg}</p>
                <Field label={`Enter OTP sent to ${newPhone}`}><input className={inputCls} inputMode="numeric" maxLength={6} placeholder="6-digit code" value={phoneOtp} onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, ""))} /></Field>
                {phoneErr && <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 mb-3 text-[13px] text-red-700">{phoneErr}</div>}
                <button className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center hover:bg-teal-700 transition-colors disabled:opacity-60" disabled={phoneLoading || phoneOtp.length < 6}
                  onClick={async () => { setPhoneErr(""); setPhoneLoading(true); try { await api.post("/auth/confirm-phone-change", { new_phone: newPhone, otp_code: phoneOtp }); setShowPhoneChange(false); clearCustomerAuth(); navigate("/login"); } catch (e: any) { setPhoneErr(e.response?.data?.detail || "Invalid OTP"); } finally { setPhoneLoading(false); } }}>
                  {phoneLoading ? <Loader2 className="size-5 animate-spin" /> : "Confirm Change"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-3"><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">{label}</label>{children}</div>;
}
