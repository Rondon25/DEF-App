import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ClipboardList, MapPin, Plus, Pencil, Trash2, Loader2, Package, Activity, Wallet, Phone, Building2, Calendar, X, ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { staffApi } from "../../api";
import { getStaffUser } from "../../hooks/useAuth";

interface Location { id: number; label: string; address: string | null; city: string | null; state: string | null; is_primary: boolean; }
interface LocForm { label: string; address: string; city: string; state: string; }
const emptyLocForm = (): LocForm => ({ label: "", address: "", city: "", state: "" });

export default function CustomerDetail() {
  const { id } = useParams();
  const qc     = useQueryClient();
  const user   = getStaffUser();
  const canEdit = ["admin","central_team"].includes(user?.role || "");

  const [addingLoc, setAddingLoc] = useState(false);
  const [newLoc,    setNewLoc]    = useState<LocForm>(emptyLocForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLoc,   setEditLoc]   = useState<LocForm>(emptyLocForm());
  const [locError,  setLocError]  = useState("");

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => staffApi.get(`/customers/${id}`).then(r => r.data),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["customer-orders", id],
    queryFn: () => staffApi.get(`/customers/${id}/orders`).then(r => r.data),
  });

  const { data: locations = [], isLoading: locsLoading } = useQuery<Location[]>({
    queryKey: ["customer-locations", id],
    queryFn: () => staffApi.get(`/customers/${id}/locations`).then(r => r.data),
    enabled: !!id,
  });

  const suspendMutation = useMutation({
    mutationFn: () => staffApi.patch(`/customers/${id}`, { status: "suspended" }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer", id] }),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => staffApi.post(`/customers/${id}/approve`, {}).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer", id] }),
  });

  const addLocMutation = useMutation({
    mutationFn: (body: LocForm) => staffApi.post(`/customers/${id}/locations`, {
      label: body.label || "Factory Location",
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-locations", id] });
      setNewLoc(emptyLocForm());
      setAddingLoc(false);
      setLocError("");
    },
    onError: (err: any) => setLocError(err.response?.data?.detail || "Failed to add location"),
  });

  const editLocMutation = useMutation({
    mutationFn: ({ locId, body }: { locId: number; body: LocForm }) =>
      staffApi.patch(`/customers/${id}/locations/${locId}`, {
        label: body.label || "Factory Location",
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-locations", id] });
      setEditingId(null);
      setLocError("");
    },
    onError: (err: any) => setLocError(err.response?.data?.detail || "Failed to update location"),
  });

  const deleteLocMutation = useMutation({
    mutationFn: (locId: number) => staffApi.delete(`/customers/${id}/locations/${locId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-locations", id] }),
    onError: (err: any) => setLocError(err.response?.data?.detail || "Failed to delete location"),
  });

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setEditLoc({ label: loc.label, address: loc.address || "", city: loc.city || "", state: loc.state || "" });
    setLocError("");
  };

  if (isLoading) return <div className="loading-screen"><span className="spinner spinner-dark" /></div>;
  if (!customer) return <div className="empty-state"><div className="empty-icon"><ClipboardList size={32} /></div><p>Customer not found</p></div>;

  const totalSpent   = orders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  const activeOrders = orders.filter((o: any) => !["closed","cancelled"].includes(o.status));
  const inputCls = "w-full h-10 rounded-xl border border-input bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const statusTone: Record<string, string> = { pending: "bg-amber-100 text-amber-700", active: "bg-green-100 text-green-700", suspended: "bg-slate-100 text-slate-600", rejected: "bg-red-100 text-red-700" };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/staff/customers" className="flex size-9 items-center justify-center rounded-full border border-border text-ink-3 hover:text-ink hover:border-primary transition-colors">
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{customer.name}</h1>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${statusTone[customer.status] || "bg-slate-100 text-slate-600"}`}>{customer.status}</span>
          </div>
        </div>
        {canEdit && customer.status === "active" && (
          <button onClick={() => suspendMutation.mutate()} disabled={suspendMutation.isPending}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
            {suspendMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Suspend Account"}
          </button>
        )}
        {canEdit && customer.status === "suspended" && (
          <button onClick={() => reactivateMutation.mutate()} disabled={reactivateMutation.isPending}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-teal-700 transition-colors">
            {reactivateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Reactivate Account"}
          </button>
        )}
      </div>

      {/* Profile + KPIs */}
      <div className="grid lg:grid-cols-[1.4fr_minmax(0,1fr)] gap-4 mb-5">
        {/* Profile */}
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-bold shrink-0">
              {customer.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-lg leading-tight">{customer.name}</div>
              {customer.company_name && <div className="text-sm text-ink-3 flex items-center gap-1.5"><Building2 size={13} /> {customer.company_name}</div>}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <InfoRow icon={<Phone size={14} />} label="Phone" value={<span className="font-mono">{customer.phone_number}</span>} />
            <InfoRow icon={<MapPin size={14} />} label="Location" value={[customer.city, customer.state].filter(Boolean).join(", ") || "—"} />
            <InfoRow icon={<Calendar size={14} />} label="Registered" value={new Date(customer.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })} />
            <InfoRow icon={<Wallet size={14} />} label="Account" value={customer.is_credit_account ? "Credit account" : "Cash account"} />
          </div>
        </div>
        {/* KPIs */}
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
          <MiniKpi icon={<Package className="size-4" />} label="Total Orders" value={orders.length} />
          <MiniKpi icon={<Activity className="size-4" />} label="Active" value={activeOrders.length} />
          <MiniKpi icon={<Wallet className="size-4" />} label="Total Spent" value={`₹${totalSpent.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
        </div>
      </div>

      {/* Delivery Locations */}
      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2"><MapPin size={17} className="text-primary" /> Delivery Locations</h3>
          {canEdit && !addingLoc && (
            <button onClick={() => { setAddingLoc(true); setLocError(""); }}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-border text-[13px] font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors">
              <Plus size={14} /> Add
            </button>
          )}
        </div>

        {locError && <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 mb-3 text-[13px] text-red-700">{locError}</div>}

        {/* Main address */}
        {(customer.address || customer.city || customer.state) && (
          <div className="flex items-start gap-3 pb-3 mb-3 border-b border-border">
            <span className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-primary shrink-0"><MapPin size={16} /></span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><span className="font-semibold text-sm">Main Address</span><span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Primary</span></div>
              <div className="text-[13px] text-ink-3 mt-0.5">{[customer.address, customer.city, customer.state].filter(Boolean).join(", ")}</div>
            </div>
          </div>
        )}

        {locsLoading ? (
          <div className="text-center py-4"><Loader2 className="size-5 animate-spin text-ink-4 inline" /></div>
        ) : locations.map((loc) => (
          <div key={loc.id} className="pb-3 mb-3 border-b border-border last:border-0 last:mb-0 last:pb-0">
            {editingId === loc.id ? (
              <div className="space-y-2.5">
                <input className={inputCls} value={editLoc.label} onChange={(e) => setEditLoc((p) => ({ ...p, label: e.target.value }))} placeholder="Location name" />
                <input className={inputCls} value={editLoc.address} onChange={(e) => setEditLoc((p) => ({ ...p, address: e.target.value }))} placeholder="Address" />
                <div className="grid grid-cols-2 gap-2.5">
                  <input className={inputCls} value={editLoc.city} onChange={(e) => setEditLoc((p) => ({ ...p, city: e.target.value }))} placeholder="City" />
                  <input className={inputCls} value={editLoc.state} onChange={(e) => setEditLoc((p) => ({ ...p, state: e.target.value }))} placeholder="State" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editLocMutation.mutate({ locId: loc.id, body: editLoc })} disabled={editLocMutation.isPending}
                    className="flex-1 h-10 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center disabled:opacity-60">
                    {editLocMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                  </button>
                  <button onClick={() => setEditingId(null)} className="flex-1 h-10 rounded-full border border-border text-sm font-semibold text-ink-2">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-canvas text-ink-4 shrink-0"><MapPin size={16} /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{loc.label}</div>
                  <div className="text-[13px] text-ink-3">{[loc.address, loc.city, loc.state].filter(Boolean).join(", ") || "—"}</div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => startEdit(loc)} className="size-8 rounded-full border border-border flex items-center justify-center text-ink-4 hover:border-primary hover:text-primary transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => deleteLocMutation.mutate(loc.id)} disabled={deleteLocMutation.isPending} className="size-8 rounded-full border border-border flex items-center justify-center text-ink-4 hover:border-red-300 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {!customer.address && !customer.city && !customer.state && locations.length === 0 && !addingLoc && (
          <p className="text-sm text-ink-4 text-center py-2">No delivery locations on file</p>
        )}

        {/* Add new location */}
        {addingLoc && (
          <div className={`${(customer.address || locations.length > 0) ? "border-t border-border pt-3" : ""} space-y-2.5`}>
            <div className="text-[13px] font-semibold text-ink-2">New Location</div>
            <input className={inputCls} value={newLoc.label} onChange={(e) => setNewLoc((p) => ({ ...p, label: e.target.value }))} placeholder="Location name (e.g. Factory A)" />
            <input className={inputCls} value={newLoc.address} onChange={(e) => setNewLoc((p) => ({ ...p, address: e.target.value }))} placeholder="Address" />
            <div className="grid grid-cols-2 gap-2.5">
              <input className={inputCls} value={newLoc.city} onChange={(e) => setNewLoc((p) => ({ ...p, city: e.target.value }))} placeholder="City" />
              <input className={inputCls} value={newLoc.state} onChange={(e) => setNewLoc((p) => ({ ...p, state: e.target.value }))} placeholder="State" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => addLocMutation.mutate(newLoc)} disabled={addLocMutation.isPending}
                className="flex-1 h-10 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center disabled:opacity-60">
                {addLocMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save location"}
              </button>
              <button onClick={() => { setAddingLoc(false); setNewLoc(emptyLocForm()); }} className="flex-1 h-10 rounded-full border border-border text-sm font-semibold text-ink-2 inline-flex items-center justify-center gap-1.5"><X size={14} /> Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Order History */}
      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="px-5 pt-5 pb-2 font-bold">Order History <span className="text-ink-4 font-normal text-sm">({orders.length})</span></div>
        {orders.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="size-12 rounded-full bg-canvas flex items-center justify-center mx-auto mb-2"><ClipboardList className="size-6 text-ink-4" /></div>
            <p className="text-sm text-ink-4">No orders yet</p>
          </div>
        ) : (
          orders.map((order: any) => (
            <Link key={order.id} to={`/staff/orders/${order.id}`} className="flex items-center gap-3 px-5 py-3 border-t border-border hover:bg-canvas transition-colors">
              <div className="size-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0"><ClipboardList className="size-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-mono font-semibold text-sm">{order.order_number}</div>
                <div className="flex items-center gap-2 mt-0.5"><StatusPill status={order.status} /><span className="text-xs text-ink-4">{new Date(order.created_at).toLocaleDateString("en-US", { dateStyle: "short" })}</span></div>
              </div>
              <div className="font-bold text-sm shrink-0">₹{order.total_amount?.toFixed(2)}</div>
              <ChevronRight className="size-4 text-ink-4 shrink-0" />
            </Link>
          ))
        )}
      </div>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-canvas text-ink-4 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] text-ink-4 uppercase tracking-wide font-semibold">{label}</div>
        <div className="text-[13px] font-medium text-ink truncate">{value}</div>
      </div>
    </div>
  );
}

function MiniKpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-ink-3 font-medium uppercase tracking-wide">{label}</span>
        <span className="flex size-7 items-center justify-center rounded-lg bg-teal-50 text-primary">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-ink">{value}</div>
    </div>
  );
}

