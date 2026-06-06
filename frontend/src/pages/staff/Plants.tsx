import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { staffApi } from "../../api";
import ConfirmDialog from "@/components/ConfirmDialog";
import { SkeletonList } from "@/components/Skeleton";
import StatCard from "@/components/ui/StatCard";
import {
  Factory, Boxes, Gauge, Package, Search, Plus, Eye, Pencil, Trash2, X, Loader2,
  FileDown, FileSpreadsheet, FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Plant {
  id: number; name: string; location: string | null;
  manager_name: string | null; manager_phone: string | null; manager_email: string | null;
  max_capacity: number | null; current_holding: number; product_count: number; utilization: number | null;
}

const empty = { name: "", location: "", manager_name: "", manager_phone: "", manager_email: "", max_capacity: "" };

export default function Plants() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const [search, setSearch] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [editPlant, setEditPlant] = useState<Plant | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [delPlant, setDelPlant] = useState<Plant | null>(null);
  const [form, setForm] = useState(empty);
  const [formErr, setFormErr] = useState("");

  const { data: plants = [], isLoading } = useQuery<Plant[]>({
    queryKey: ["plants"],
    queryFn: () => staffApi.get("/admin/plants").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["plants"] });

  const saveMutation = useMutation({
    mutationFn: (body: any) => {
      const payload = { ...body, max_capacity: body.max_capacity ? parseFloat(body.max_capacity) : null };
      return editPlant
        ? staffApi.patch(`/admin/plants/${editPlant.id}`, payload).then((r) => r.data)
        : staffApi.post("/admin/plants", payload).then((r) => r.data);
    },
    onSuccess: () => { invalidate(); closeForm(); },
    onError: (e: any) => setFormErr(e.response?.data?.detail || "Failed to save plant"),
  });
  const archiveMutation = useMutation({
    mutationFn: (id: number) => staffApi.post(`/admin/plants/${id}/archive`, {}).then((r) => r.data),
    onSuccess: () => { invalidate(); setDelPlant(null); },
  });

  const closeForm = () => { setShowAdd(false); setEditPlant(null); setForm(empty); setFormErr(""); };
  const openEdit = (p: Plant) => {
    setEditPlant(p);
    setForm({ name: p.name, location: p.location || "", manager_name: p.manager_name || "", manager_phone: p.manager_phone || "", manager_email: p.manager_email || "", max_capacity: p.max_capacity != null ? String(p.max_capacity) : "" });
    setFormErr("");
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return plants;
    const q = search.toLowerCase();
    return plants.filter((p) => p.name.toLowerCase().includes(q) || (p.location || "").toLowerCase().includes(q) || (p.manager_name || "").toLowerCase().includes(q));
  }, [plants, search]);

  const kpi = useMemo(() => {
    const totalCap = plants.reduce((s, p) => s + (p.max_capacity || 0), 0);
    const totalHold = plants.reduce((s, p) => s + p.current_holding, 0);
    return {
      count: plants.length,
      capacity: totalCap,
      holding: totalHold,
      util: totalCap ? Math.round((totalHold / totalCap) * 100) : 0,
    };
  }, [plants]);

  const exportExcel = () => {
    const data = plants.map((p) => ({ Plant: p.name, Location: p.location || "", Manager: p.manager_name || "", Phone: p.manager_phone || "", Capacity: p.max_capacity ?? "", Holding: p.current_holding, Utilization: p.utilization != null ? `${p.utilization}%` : "", Products: p.product_count }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plants");
    XLSX.writeFile(wb, `plants_${today}.xlsx`);
    setShowExport(false);
  };
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.setTextColor(13, 148, 136);
    doc.text("Rohan Energy Solutions - Plants", 14, 18);
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })} · ${plants.length} plants`, 14, 25);
    autoTable(doc, {
      startY: 31,
      head: [["Plant", "Location", "Manager", "Capacity", "Holding", "Util %"]],
      body: plants.map((p) => [p.name, p.location || "", p.manager_name || "", p.max_capacity ?? "-", p.current_holding, p.utilization != null ? `${p.utilization}%` : "-"]),
      headStyles: { fillColor: [30, 30, 45], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
    doc.save(`plants_${today}.pdf`);
    setShowExport(false);
  };

  const inputCls = "w-full h-11 rounded-xl border border-input bg-surface px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Plants</h1>
        <p className="text-sm text-ink-3">Manage factories &amp; warehouses</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Plants" value={kpi.count} icon={<Factory className="size-4" />} />
        <StatCard label="Total Capacity" value={kpi.capacity.toLocaleString("en-IN")} icon={<Boxes className="size-4" />} />
        <StatCard label="Total Holding" value={kpi.holding.toLocaleString("en-IN")} icon={<Package className="size-4" />} />
        <StatCard label="Utilization" value={`${kpi.util}%`} icon={<Gauge className="size-4" />} />
      </div>

      {/* Search + actions */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-4" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, location, manager..."
            className="w-full h-11 rounded-full border border-input bg-surface pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-4" />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowExport((v) => !v)} disabled={plants.length === 0}
              className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full border border-border bg-surface text-sm font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
              <FileDown size={16} /> Export
            </button>
            {showExport && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
                <div className="absolute right-0 top-12 z-20 w-44 bg-surface rounded-xl shadow-[var(--shadow-lg)] border border-border overflow-hidden">
                  <button onClick={exportExcel} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-canvas text-left"><FileSpreadsheet size={16} className="text-green-600" /> Excel</button>
                  <button onClick={exportPDF} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-canvas text-left border-t border-border"><FileText size={16} className="text-red-600" /> PDF</button>
                </div>
              </>
            )}
          </div>
          <button onClick={() => { setShowAdd(true); setForm(empty); setFormErr(""); }}
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-teal-700 transition-colors">
            <Plus size={16} /> Add Plant
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <SkeletonList rows={5} />
      ) : (
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border">
                  <th className="px-5 py-3">Plant</th>
                  <th className="px-5 py-3">Manager</th>
                  <th className="px-5 py-3">Products</th>
                  <th className="px-5 py-3 w-[200px]">Utilization</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3.5">
                      <Link to={`/staff/plants/${p.id}`} className="font-semibold text-sm hover:text-primary">{p.name}</Link>
                      {p.location && <div className="text-[12px] text-ink-4">{p.location}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      {p.manager_name ? <>{p.manager_name}{p.manager_phone && <span className="text-ink-4 text-[12px] block font-mono">{p.manager_phone}</span>}</> : <span className="text-ink-4">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm">{p.product_count}</td>
                    <td className="px-5 py-3.5">
                      {p.max_capacity ? (
                        <div>
                          <div className="flex justify-between text-[12px] mb-1">
                            <span className="text-ink-3">{p.current_holding.toLocaleString("en-IN")} / {p.max_capacity.toLocaleString("en-IN")}</span>
                            <span className="font-bold">{p.utilization}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-canvas overflow-hidden">
                            <div className="h-2 rounded-full" style={{ width: `${Math.min(100, p.utilization || 0)}%`, background: (p.utilization || 0) > 90 ? "var(--color-danger)" : (p.utilization || 0) > 70 ? "var(--color-amber-500)" : "var(--color-teal-600)" }} />
                          </div>
                        </div>
                      ) : <span className="text-ink-4 text-sm">No capacity set</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/staff/plants/${p.id}`} className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-border text-[12px] font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors"><Eye size={14} /> View</Link>
                        <button onClick={() => openEdit(p)} className="size-8 rounded-full border border-border flex items-center justify-center text-ink-4 hover:border-primary hover:text-primary transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => setDelPlant(p)} className="size-8 rounded-full border border-border flex items-center justify-center text-ink-4 hover:border-red-300 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-4">{search ? "No plants match your search" : "No plants yet — add your first factory or warehouse"}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {(showAdd || editPlant) && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-end sm:items-center sm:justify-center" onClick={closeForm}>
          <div className="bg-surface w-full sm:max-w-[460px] rounded-t-2xl sm:rounded-2xl p-6 max-h-[92dvh] overflow-auto" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editPlant ? "Edit Plant" : "Add Plant"}</h3>
              <button onClick={closeForm} className="text-ink-3"><X size={20} /></button>
            </div>
            {formErr && <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 mb-3 text-[13px] text-red-700">{formErr}</div>}
            <div className="space-y-3">
              <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Plant name *</label><input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Mumbai Plant" /></div>
              <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Location</label><input className={inputCls} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="MIDC Industrial Area, Maharashtra" /></div>
              <div className="pt-1 text-[11px] font-bold uppercase tracking-wider text-ink-4">Plant Manager</div>
              <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Manager name</label><input className={inputCls} value={form.manager_name} onChange={(e) => setForm((f) => ({ ...f, manager_name: e.target.value }))} placeholder="Rajesh Kumar" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Phone</label><input className={inputCls} value={form.manager_phone} onChange={(e) => setForm((f) => ({ ...f, manager_phone: e.target.value }))} placeholder="91XXXXXXXXXX" /></div>
                <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Email</label><input className={inputCls} value={form.manager_email} onChange={(e) => setForm((f) => ({ ...f, manager_email: e.target.value }))} placeholder="rajesh@..." /></div>
              </div>
              <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">Max holding capacity (units)</label><input type="number" min="0" className={inputCls} value={form.max_capacity} onChange={(e) => setForm((f) => ({ ...f, max_capacity: e.target.value }))} placeholder="10000" /></div>
            </div>
            <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name}
              className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-colors disabled:opacity-60 mt-5">
              {saveMutation.isPending ? <Loader2 className="size-5 animate-spin" /> : editPlant ? "Save Changes" : <><Plus size={16} /> Create Plant</>}
            </button>
          </div>
        </div>
      )}

      {delPlant && (
        <ConfirmDialog
          title="Archive plant?"
          message={<>This removes <strong>{delPlant.name}</strong> from the active list. Its stock records are kept and it can be restored from the database.</>}
          confirmLabel="Archive"
          loading={archiveMutation.isPending}
          onConfirm={() => archiveMutation.mutate(delPlant.id)}
          onCancel={() => setDelPlant(null)}
        />
      )}
    </>
  );
}

