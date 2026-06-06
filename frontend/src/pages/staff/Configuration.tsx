import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Settings2, Factory, Droplet, Boxes, Truck, Link2, FlaskConical,
  Plus, Pencil, Trash2, X, Loader2, Check,
} from "lucide-react";

type Tab = "plants" | "skus" | "materials" | "vendors" | "sourcing" | "bom";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "plants",    label: "Plant Capacity", icon: Factory },
  { id: "skus",      label: "SKU Recipe",     icon: Droplet },
  { id: "materials", label: "Raw Materials",  icon: Boxes },
  { id: "vendors",   label: "Vendors",        icon: Truck },
  { id: "sourcing",  label: "Sourcing Terms", icon: Link2 },
  { id: "bom",       label: "Bill of Materials", icon: FlaskConical },
];

const inputCls = "w-full h-10 rounded-lg border border-input bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const cellInput = "w-24 h-9 rounded-lg border border-input bg-surface px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function Configuration() {
  const [tab, setTab] = useState<Tab>("plants");

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2"><Settings2 className="size-6 text-primary" /> Configuration</h1>
        <p className="text-sm text-ink-3">Master data &amp; manufacturing assumptions — plant capacity, recipes, vendors and sourcing terms</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-colors ${active ? "bg-primary text-white" : "bg-surface border border-border text-ink-2 hover:border-primary hover:text-primary"}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "plants"    && <PlantCapacity />}
      {tab === "skus"      && <SkuRecipe />}
      {tab === "materials" && <Materials />}
      {tab === "vendors"   && <Vendors />}
      {tab === "sourcing"  && <Sourcing />}
      {tab === "bom"       && <Bom />}
    </>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden"><div className="overflow-x-auto">{children}</div></div>;
}
function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 ${className}`}>{children}</th>;
}

// ── Inline numeric cell that PATCHes on blur ──────────────────────────────────
function NumCell({ value, onSave, suffix }: { value: number; onSave: (v: number) => void; suffix?: string }) {
  const [v, setV] = useState(String(value ?? 0));
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex items-center gap-1.5">
      <input type="number" className={cellInput} value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { const n = parseFloat(v) || 0; if (n !== value) { onSave(n); setSaved(true); setTimeout(() => setSaved(false), 1200); } }} />
      {suffix && <span className="text-[12px] text-ink-4">{suffix}</span>}
      {saved && <Check size={14} className="text-green-600" />}
    </div>
  );
}

// ── Plant capacity ────────────────────────────────────────────────────────────
function PlantCapacity() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["cfg-plants"], queryFn: () => staffApi.get("/admin/config/plants").then((r) => r.data) });
  const save = useMutation({
    mutationFn: ({ id, body }: any) => staffApi.patch(`/admin/config/plants/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cfg-plants"] }),
  });
  if (isLoading) return <Loading />;
  return (
    <Panel>
      <table className="w-full min-w-[860px]">
        <thead><tr className="border-b border-border">
          <Th>Plant</Th><Th>Working days/mo</Th><Th>Shifts/day</Th><Th>Hours/shift</Th><Th>Effective hrs/day</Th><Th>Capacity hrs/mo</Th>
        </tr></thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3"><div className="font-semibold text-sm">{p.name}</div><div className="text-[12px] text-ink-4">{p.location}</div></td>
              <td className="px-4 py-3"><NumCell value={p.working_days_per_month} onSave={(v) => save.mutate({ id: p.id, body: { working_days_per_month: v } })} /></td>
              <td className="px-4 py-3"><NumCell value={p.shifts_per_day} onSave={(v) => save.mutate({ id: p.id, body: { shifts_per_day: v } })} /></td>
              <td className="px-4 py-3"><NumCell value={p.hours_per_shift} onSave={(v) => save.mutate({ id: p.id, body: { hours_per_shift: v } })} /></td>
              <td className="px-4 py-3 font-mono text-sm text-ink-2">{p.effective_hours_per_day}</td>
              <td className="px-4 py-3 font-mono text-sm font-bold">{p.capacity_hours_month}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

// ── SKU recipe / economics ────────────────────────────────────────────────────
function SkuRecipe() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["cfg-skus"], queryFn: () => staffApi.get("/admin/config/skus").then((r) => r.data) });
  const save = useMutation({
    mutationFn: ({ id, body }: any) => staffApi.patch(`/admin/config/skus/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cfg-skus"] }),
  });
  if (isLoading) return <Loading />;
  const cell = (s: any, field: string, suffix?: string) =>
    <NumCell value={s[field]} suffix={suffix} onSave={(v) => save.mutate({ id: s.id, body: { [field]: v } })} />;
  return (
    <Panel>
      <table className="w-full min-w-[1040px]">
        <thead><tr className="border-b border-border">
          <Th>SKU</Th><Th>Granule kg/unit</Th><Th>Packaging/unit</Th><Th>Output units/hr</Th><Th>Min safety stock</Th><Th>Dispatch cost/unit</Th><Th>Revenue/unit</Th>
        </tr></thead>
        <tbody>
          {data.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3"><div className="font-semibold text-sm">{s.name}</div><div className="text-[12px] font-mono text-ink-4">{s.code}</div></td>
              <td className="px-4 py-3">{cell(s, "granule_kg_per_unit", "kg")}</td>
              <td className="px-4 py-3">{cell(s, "packaging_per_unit")}</td>
              <td className="px-4 py-3">{cell(s, "target_output_per_shift_hour")}</td>
              <td className="px-4 py-3">{cell(s, "min_fg_safety_stock")}</td>
              <td className="px-4 py-3">{cell(s, "dispatch_cost_per_unit", "₹")}</td>
              <td className="px-4 py-3">{cell(s, "revenue_per_unit", "₹")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

// ── Raw materials ─────────────────────────────────────────────────────────────
const MAT_TYPES = ["granule", "packaging", "label", "misc"];
function Materials() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["cfg-materials"], queryFn: () => staffApi.get("/admin/config/materials").then((r) => r.data) });
  const [edit, setEdit] = useState<any | null>(null);
  const [adding, setAdding] = useState(false);
  const [del, setDel] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", type: "granule", unit: "kg" });
  const inv = () => qc.invalidateQueries({ queryKey: ["cfg-materials"] });
  const save = useMutation({
    mutationFn: () => edit ? staffApi.patch(`/admin/config/materials/${edit.id}`, form).then((r) => r.data) : staffApi.post("/admin/config/materials", form).then((r) => r.data),
    onSuccess: () => { inv(); close(); },
  });
  const archive = useMutation({ mutationFn: (id: number) => staffApi.post(`/admin/config/materials/${id}/archive`, {}), onSuccess: () => { inv(); setDel(null); } });
  const close = () => { setEdit(null); setAdding(false); setForm({ name: "", type: "granule", unit: "kg" }); };
  const openEdit = (m: any) => { setEdit(m); setForm({ name: m.name, type: m.type, unit: m.unit }); };

  if (isLoading) return <Loading />;
  return (
    <>
      <div className="flex justify-end mb-3"><AddBtn onClick={() => { setAdding(true); setForm({ name: "", type: "granule", unit: "kg" }); }} label="Add Material" /></div>
      <Panel>
        <table className="w-full min-w-[520px]">
          <thead><tr className="border-b border-border"><Th>Material</Th><Th>Type</Th><Th>Unit</Th><Th className="text-right">Actions</Th></tr></thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-sm">{m.name}</td>
                <td className="px-4 py-3"><span className="text-[12px] px-2 py-0.5 rounded-full bg-canvas text-ink-2 capitalize">{m.type}</span></td>
                <td className="px-4 py-3 text-sm">{m.unit}</td>
                <td className="px-4 py-3"><RowActions onEdit={() => openEdit(m)} onDelete={() => setDel(m)} /></td>
              </tr>
            ))}
            {data.length === 0 && <Empty cols={4} text="No raw materials yet" />}
          </tbody>
        </table>
      </Panel>
      {(adding || edit) && (
        <Modal title={edit ? "Edit Material" : "Add Material"} onClose={close} onSave={() => save.mutate()} saving={save.isPending} disabled={!form.name}>
          <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Granules" /></Field>
          <Field label="Type"><select className={inputCls} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>{MAT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}</select></Field>
          <Field label="Unit"><input className={inputCls} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="kg / units" /></Field>
        </Modal>
      )}
      {del && <ConfirmDialog title="Archive material?" message={<>Remove <strong>{del.name}</strong> from active materials.</>} confirmLabel="Archive" loading={archive.isPending} onConfirm={() => archive.mutate(del.id)} onCancel={() => setDel(null)} />}
    </>
  );
}

// ── Vendors ───────────────────────────────────────────────────────────────────
function Vendors() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["cfg-vendors"], queryFn: () => staffApi.get("/admin/config/vendors").then((r) => r.data) });
  const [edit, setEdit] = useState<any | null>(null);
  const [adding, setAdding] = useState(false);
  const [del, setDel] = useState<any | null>(null);
  const empty = { name: "", contact_name: "", phone: "", email: "" };
  const [form, setForm] = useState(empty);
  const inv = () => qc.invalidateQueries({ queryKey: ["cfg-vendors"] });
  const save = useMutation({
    mutationFn: () => edit ? staffApi.patch(`/admin/config/vendors/${edit.id}`, form).then((r) => r.data) : staffApi.post("/admin/config/vendors", form).then((r) => r.data),
    onSuccess: () => { inv(); close(); },
  });
  const archive = useMutation({ mutationFn: (id: number) => staffApi.post(`/admin/config/vendors/${id}/archive`, {}), onSuccess: () => { inv(); setDel(null); } });
  const close = () => { setEdit(null); setAdding(false); setForm(empty); };
  const openEdit = (v: any) => { setEdit(v); setForm({ name: v.name, contact_name: v.contact_name || "", phone: v.phone || "", email: v.email || "" }); };
  if (isLoading) return <Loading />;
  return (
    <>
      <div className="flex justify-end mb-3"><AddBtn onClick={() => { setAdding(true); setForm(empty); }} label="Add Vendor" /></div>
      <Panel>
        <table className="w-full min-w-[640px]">
          <thead><tr className="border-b border-border"><Th>Vendor</Th><Th>Contact</Th><Th>Phone</Th><Th>Email</Th><Th className="text-right">Actions</Th></tr></thead>
          <tbody>
            {data.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-sm">{v.name}</td>
                <td className="px-4 py-3 text-sm">{v.contact_name || "—"}</td>
                <td className="px-4 py-3 text-sm font-mono">{v.phone || "—"}</td>
                <td className="px-4 py-3 text-sm">{v.email || "—"}</td>
                <td className="px-4 py-3"><RowActions onEdit={() => openEdit(v)} onDelete={() => setDel(v)} /></td>
              </tr>
            ))}
            {data.length === 0 && <Empty cols={5} text="No vendors yet" />}
          </tbody>
        </table>
      </Panel>
      {(adding || edit) && (
        <Modal title={edit ? "Edit Vendor" : "Add Vendor"} onClose={close} onSave={() => save.mutate()} saving={save.isPending} disabled={!form.name}>
          <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Vendor A" /></Field>
          <Field label="Contact name"><input className={inputCls} value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
            <Field label="Email"><input className={inputCls} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}
      {del && <ConfirmDialog title="Archive vendor?" message={<>Remove <strong>{del.name}</strong> from active vendors.</>} confirmLabel="Archive" loading={archive.isPending} onConfirm={() => archive.mutate(del.id)} onCancel={() => setDel(null)} />}
    </>
  );
}

// ── Sourcing terms ────────────────────────────────────────────────────────────
function Sourcing() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["cfg-sourcing"], queryFn: () => staffApi.get("/admin/config/sourcing").then((r) => r.data) });
  const { data: vendors = [] } = useQuery<any[]>({ queryKey: ["cfg-vendors"], queryFn: () => staffApi.get("/admin/config/vendors").then((r) => r.data) });
  const { data: materials = [] } = useQuery<any[]>({ queryKey: ["cfg-materials"], queryFn: () => staffApi.get("/admin/config/materials").then((r) => r.data) });
  const { data: plants = [] } = useQuery<any[]>({ queryKey: ["cfg-plants"], queryFn: () => staffApi.get("/admin/config/plants").then((r) => r.data) });
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [del, setDel] = useState<any | null>(null);
  const empty = { vendor_id: "", material_id: "", plant_id: "", lead_time_days: 7, safety_stock_days: 3, min_order_qty: 0, unit_cost: 0 };
  const [form, setForm] = useState<any>(empty);
  const inv = () => qc.invalidateQueries({ queryKey: ["cfg-sourcing"] });
  const body = () => ({ ...form, vendor_id: +form.vendor_id, material_id: +form.material_id, plant_id: form.plant_id ? +form.plant_id : null, lead_time_days: +form.lead_time_days, safety_stock_days: +form.safety_stock_days, min_order_qty: +form.min_order_qty, unit_cost: +form.unit_cost });
  const save = useMutation({
    mutationFn: () => edit ? staffApi.patch(`/admin/config/sourcing/${edit.id}`, body()).then((r) => r.data) : staffApi.post("/admin/config/sourcing", body()).then((r) => r.data),
    onSuccess: () => { inv(); close(); },
  });
  const remove = useMutation({ mutationFn: (id: number) => staffApi.delete(`/admin/config/sourcing/${id}`), onSuccess: () => { inv(); setDel(null); } });
  const close = () => { setAdding(false); setEdit(null); setForm(empty); };
  const openEdit = (s: any) => { setEdit(s); setForm({ vendor_id: s.vendor_id, material_id: s.material_id, plant_id: s.plant_id || "", lead_time_days: s.lead_time_days, safety_stock_days: s.safety_stock_days, min_order_qty: s.min_order_qty, unit_cost: s.unit_cost }); };
  if (isLoading) return <Loading />;
  return (
    <>
      <div className="flex justify-end mb-3"><AddBtn onClick={() => { setAdding(true); setForm(empty); }} label="Add Sourcing Term" /></div>
      <Panel>
        <table className="w-full min-w-[920px]">
          <thead><tr className="border-b border-border"><Th>Material</Th><Th>Vendor</Th><Th>Plant</Th><Th>Lead time</Th><Th>Safety days</Th><Th>MOQ</Th><Th>Unit cost</Th><Th className="text-right">Actions</Th></tr></thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-sm">{s.material_name}</td>
                <td className="px-4 py-3 text-sm">{s.vendor_name}</td>
                <td className="px-4 py-3 text-sm text-ink-3">{s.plant_name}</td>
                <td className="px-4 py-3 text-sm">{s.lead_time_days} d</td>
                <td className="px-4 py-3 text-sm">{s.safety_stock_days} d</td>
                <td className="px-4 py-3 text-sm">{s.min_order_qty.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-mono">₹{s.unit_cost}</td>
                <td className="px-4 py-3"><RowActions onEdit={() => openEdit(s)} onDelete={() => setDel(s)} /></td>
              </tr>
            ))}
            {data.length === 0 && <Empty cols={8} text="No sourcing terms yet" />}
          </tbody>
        </table>
      </Panel>
      {(adding || edit) && (
        <Modal title={edit ? "Edit Sourcing Term" : "Add Sourcing Term"} onClose={close} onSave={() => save.mutate()} saving={save.isPending} disabled={!form.vendor_id || !form.material_id}>
          <Field label="Material"><select className={inputCls} value={form.material_id} onChange={(e) => setForm((f: any) => ({ ...f, material_id: e.target.value }))}><option value="">Select…</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
          <Field label="Vendor"><select className={inputCls} value={form.vendor_id} onChange={(e) => setForm((f: any) => ({ ...f, vendor_id: e.target.value }))}><option value="">Select…</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
          <Field label="Plant (blank = all)"><select className={inputCls} value={form.plant_id} onChange={(e) => setForm((f: any) => ({ ...f, plant_id: e.target.value }))}><option value="">All plants</option>{plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lead time (days)"><input type="number" className={inputCls} value={form.lead_time_days} onChange={(e) => setForm((f: any) => ({ ...f, lead_time_days: e.target.value }))} /></Field>
            <Field label="Safety stock (days)"><input type="number" className={inputCls} value={form.safety_stock_days} onChange={(e) => setForm((f: any) => ({ ...f, safety_stock_days: e.target.value }))} /></Field>
            <Field label="Min order qty"><input type="number" className={inputCls} value={form.min_order_qty} onChange={(e) => setForm((f: any) => ({ ...f, min_order_qty: e.target.value }))} /></Field>
            <Field label="Unit cost (₹)"><input type="number" className={inputCls} value={form.unit_cost} onChange={(e) => setForm((f: any) => ({ ...f, unit_cost: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}
      {del && <ConfirmDialog title="Remove sourcing term?" message={<>Remove <strong>{del.material_name} · {del.vendor_name}</strong>.</>} confirmLabel="Remove" loading={remove.isPending} onConfirm={() => remove.mutate(del.id)} onCancel={() => setDel(null)} />}
    </>
  );
}

// ── Bill of materials ─────────────────────────────────────────────────────────
function Bom() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["cfg-bom"], queryFn: () => staffApi.get("/admin/config/bom").then((r) => r.data) });
  const { data: skus = [] } = useQuery<any[]>({ queryKey: ["cfg-skus"], queryFn: () => staffApi.get("/admin/config/skus").then((r) => r.data) });
  const { data: materials = [] } = useQuery<any[]>({ queryKey: ["cfg-materials"], queryFn: () => staffApi.get("/admin/config/materials").then((r) => r.data) });
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [del, setDel] = useState<any | null>(null);
  const empty = { sku_id: "", material_id: "", qty_per_unit: 0 };
  const [form, setForm] = useState<any>(empty);
  const inv = () => qc.invalidateQueries({ queryKey: ["cfg-bom"] });
  const body = () => ({ sku_id: +form.sku_id, material_id: +form.material_id, qty_per_unit: +form.qty_per_unit });
  const save = useMutation({
    mutationFn: () => edit ? staffApi.patch(`/admin/config/bom/${edit.id}`, body()).then((r) => r.data) : staffApi.post("/admin/config/bom", body()).then((r) => r.data),
    onSuccess: () => { inv(); close(); },
  });
  const remove = useMutation({ mutationFn: (id: number) => staffApi.delete(`/admin/config/bom/${id}`), onSuccess: () => { inv(); setDel(null); } });
  const close = () => { setAdding(false); setEdit(null); setForm(empty); };
  const openEdit = (b: any) => { setEdit(b); setForm({ sku_id: b.sku_id, material_id: b.material_id, qty_per_unit: b.qty_per_unit }); };
  if (isLoading) return <Loading />;

  // group by sku
  const bySku: Record<string, any[]> = {};
  data.forEach((b) => { (bySku[b.sku_code] = bySku[b.sku_code] || []).push(b); });

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] text-ink-3">Raw materials consumed per finished unit of each SKU.</p>
        <AddBtn onClick={() => { setAdding(true); setForm(empty); }} label="Add BOM Line" />
      </div>
      <Panel>
        <table className="w-full min-w-[640px]">
          <thead><tr className="border-b border-border"><Th>SKU</Th><Th>Material</Th><Th>Qty per unit</Th><Th className="text-right">Actions</Th></tr></thead>
          <tbody>
            {Object.entries(bySku).map(([code, items]) => items.map((b, i) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{i === 0 ? <><div className="font-semibold text-sm">{b.sku_name}</div><div className="text-[12px] font-mono text-ink-4">{code}</div></> : ""}</td>
                <td className="px-4 py-3 text-sm">{b.material_name}</td>
                <td className="px-4 py-3 text-sm font-mono">{b.qty_per_unit} {b.material_unit}</td>
                <td className="px-4 py-3"><RowActions onEdit={() => openEdit(b)} onDelete={() => setDel(b)} /></td>
              </tr>
            )))}
            {data.length === 0 && <Empty cols={4} text="No BOM lines yet" />}
          </tbody>
        </table>
      </Panel>
      {(adding || edit) && (
        <Modal title={edit ? "Edit BOM Line" : "Add BOM Line"} onClose={close} onSave={() => save.mutate()} saving={save.isPending} disabled={!form.sku_id || !form.material_id}>
          <Field label="SKU"><select className={inputCls} value={form.sku_id} onChange={(e) => setForm((f: any) => ({ ...f, sku_id: e.target.value }))}><option value="">Select…</option>{skus.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select></Field>
          <Field label="Material"><select className={inputCls} value={form.material_id} onChange={(e) => setForm((f: any) => ({ ...f, material_id: e.target.value }))}><option value="">Select…</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
          <Field label="Qty per finished unit"><input type="number" step="any" className={inputCls} value={form.qty_per_unit} onChange={(e) => setForm((f: any) => ({ ...f, qty_per_unit: e.target.value }))} /></Field>
        </Modal>
      )}
      {del && <ConfirmDialog title="Remove BOM line?" message={<>Remove <strong>{del.material_name}</strong> from <strong>{del.sku_code}</strong>.</>} confirmLabel="Remove" loading={remove.isPending} onConfirm={() => remove.mutate(del.id)} onCancel={() => setDel(null)} />}
    </>
  );
}

// ── shared bits ───────────────────────────────────────────────────────────────
function Loading() { return <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-10 flex justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>; }
function Empty({ cols, text }: { cols: number; text: string }) { return <tr><td colSpan={cols} className="px-4 py-10 text-center text-ink-4">{text}</td></tr>; }
function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary text-white text-sm font-semibold hover:bg-teal-700 transition-colors"><Plus size={16} /> {label}</button>;
}
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button onClick={onEdit} className="size-8 rounded-full border border-border flex items-center justify-center text-ink-4 hover:border-primary hover:text-primary transition-colors"><Pencil size={14} /></button>
      <button onClick={onDelete} className="size-8 rounded-full border border-border flex items-center justify-center text-ink-4 hover:border-red-300 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">{label}</label>{children}</div>;
}
function Modal({ title, children, onClose, onSave, saving, disabled }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void; saving: boolean; disabled?: boolean }) {
  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-[460px] rounded-t-2xl sm:rounded-2xl p-6 max-h-[92dvh] overflow-auto" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">{title}</h3><button onClick={onClose} className="text-ink-3"><X size={20} /></button></div>
        <div className="space-y-3">{children}</div>
        <button onClick={onSave} disabled={saving || disabled} className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-colors disabled:opacity-60 mt-5">
          {saving ? <Loader2 className="size-5 animate-spin" /> : "Save"}
        </button>
      </div>
    </div>
  );
}
