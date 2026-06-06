import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";
import { SkeletonList } from "@/components/Skeleton";
import ConfirmDialog from "@/components/ConfirmDialog";
import Ring from "@/components/charts/Ring";
import {
  Gauge, Clock, X, Loader2, Plus, CheckCircle2, AlertTriangle, FlaskConical,
  FileDown, FileSpreadsheet, FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Run {
  id: number; plant_id: number; plant_name: string; sku_id: number; sku_code: string; sku_name: string; unit: string;
  run_date: string; planned_units: number; produced_units: number; hours_required: number; status: string; note: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700", cancelled: "bg-gray-100 text-gray-500",
};

export default function Production() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [capDate, setCapDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [completeRun, setCompleteRun] = useState<Run | null>(null);
  const [cancelRun, setCancelRun] = useState<Run | null>(null);
  const [showExport, setShowExport] = useState(false);

  const { data: runs = [], isLoading } = useQuery<Run[]>({ queryKey: ["production"], queryFn: () => staffApi.get("/admin/production").then((r) => r.data), refetchInterval: 30_000 });
  const { data: cap } = useQuery<any>({ queryKey: ["capacity", capDate], queryFn: () => staffApi.get(`/admin/production/capacity?run_date=${capDate}`).then((r) => r.data), refetchInterval: 30_000 });
  const inv = () => { qc.invalidateQueries({ queryKey: ["production"] }); qc.invalidateQueries({ queryKey: ["capacity"] }); qc.invalidateQueries({ queryKey: ["fg-summary"] }); qc.invalidateQueries({ queryKey: ["rm-stock"] }); };

  const cancel = useMutation({ mutationFn: (id: number) => staffApi.post(`/admin/production/${id}/cancel`, {}), onSuccess: () => { inv(); setCancelRun(null); } });

  const filtered = runs.filter((r) => statusFilter === "all" || r.status === statusFilter);

  const exportExcel = () => {
    const data = filtered.map((r) => ({ Date: r.run_date, Plant: r.plant_name, SKU: r.sku_code, Product: r.sku_name, Planned: r.planned_units, Produced: r.produced_units, "Hours Req": r.hours_required, Status: r.status }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Production"); XLSX.writeFile(wb, `production_${today}.xlsx`); setShowExport(false);
  };
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.setTextColor(13, 148, 136); doc.text("Production Plan", 14, 18);
    doc.setFontSize(10); doc.setTextColor(120); doc.text(`Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}`, 14, 25);
    autoTable(doc, { startY: 31, head: [["Date", "Plant", "Product", "Planned", "Produced", "Hrs", "Status"]],
      body: filtered.map((r) => [r.run_date, r.plant_name, r.sku_name, r.planned_units, r.produced_units, r.hours_required, r.status]),
      headStyles: { fillColor: [30, 30, 45], textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [248, 249, 250] }, styles: { fontSize: 9, cellPadding: 3 } });
    doc.save(`production_${today}.pdf`); setShowExport(false);
  };

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Production</h1>
        <p className="text-sm text-ink-3">Daily scheduling, capacity checks &amp; batch execution</p>
      </div>

      {/* Capacity overview */}
      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-5 mb-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold flex items-center gap-2"><Gauge size={17} className="text-primary" /> Capacity Utilization</h3>
          <input type="date" value={capDate} onChange={(e) => setCapDate(e.target.value)} className="h-9 rounded-lg border border-input bg-surface px-3 text-sm outline-none focus:border-primary" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(cap?.plants ?? []).map((p: any) => {
            const color = p.over_capacity ? "var(--color-danger)" : p.utilization > 80 ? "var(--color-amber-500)" : "var(--color-teal-600)";
            return (
              <div key={p.plant_id} className="rounded-xl border border-border p-4 flex items-center gap-4">
                <Ring value={p.utilization} size={64} thickness={7} color={color} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5"><span className="font-semibold text-sm truncate">{p.plant_name}</span>{p.over_capacity && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1 shrink-0"><AlertTriangle size={11} /> Over</span>}</div>
                  <div className="text-lg font-bold leading-tight">{p.used_hours}<span className="text-ink-4 text-[13px] font-normal"> / {p.capacity_hours} hrs</span></div>
                  <div className="text-[12px] text-ink-4 mt-0.5">{p.run_count} run(s) · {p.planned_units.toLocaleString()} units</div>
                </div>
              </div>
            );
          })}
          {(!cap || cap.plants.length === 0) && <div className="text-sm text-ink-4 col-span-full py-4 text-center">No plants configured</div>}
        </div>
      </div>

      {/* status pills + actions */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex gap-2">
          {["all", "planned", "completed", "cancelled"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`h-9 px-3.5 rounded-full text-[13px] font-medium capitalize transition-colors ${statusFilter === s ? "bg-primary text-white" : "bg-surface border border-border text-ink-2 hover:border-primary"}`}>{s}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowExport((v) => !v)} disabled={runs.length === 0} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border bg-surface text-sm font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"><FileDown size={16} /> Export</button>
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
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-teal-700 transition-colors"><Plus size={16} /> Schedule Run</button>
        </div>
      </div>

      {/* runs table */}
      {isLoading ? <SkeletonList rows={5} /> : (
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead><tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border">
                <th className="px-4 py-3">Date</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Plant</th><th className="px-4 py-3">Units</th><th className="px-4 py-3">Hrs Req</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-canvas">
                    <td className="px-4 py-3 text-sm text-ink-3">{r.run_date}</td>
                    <td className="px-4 py-3"><div className="font-semibold text-sm">{r.sku_name}</div><div className="text-[12px] font-mono text-ink-4">{r.sku_code}</div></td>
                    <td className="px-4 py-3 text-sm text-ink-2">{r.plant_name}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{r.status === "completed" ? r.produced_units.toLocaleString() : r.planned_units.toLocaleString()} <span className="text-ink-4 font-normal text-xs">{r.unit}</span></td>
                    <td className="px-4 py-3 text-sm"><span className="inline-flex items-center gap-1"><Clock size={12} className="text-ink-4" /> {r.hours_required}</span></td>
                    <td className="px-4 py-3"><span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_STYLE[r.status]}`}>{r.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "planned" && <>
                          <button onClick={() => setCompleteRun(r)} className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-primary text-white text-[12px] font-medium hover:bg-teal-700 transition-colors"><CheckCircle2 size={14} /> Complete</button>
                          <button onClick={() => setCancelRun(r)} className="h-8 px-3 rounded-full border border-border text-[12px] text-ink-3 hover:border-red-300 hover:text-red-600 transition-colors">Cancel</button>
                        </>}
                        {r.status === "completed" && <span className="text-[12px] text-green-600 inline-flex items-center gap-1"><CheckCircle2 size={14} /> Done</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-4">No production runs{statusFilter !== "all" ? ` (${statusFilter})` : " — schedule your first batch"}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <ScheduleModal onClose={() => setShowAdd(false)} onSaved={() => { inv(); setShowAdd(false); }} />}
      {completeRun && <CompleteModal run={completeRun} onClose={() => setCompleteRun(null)} onSaved={() => { inv(); setCompleteRun(null); }} />}
      {cancelRun && <ConfirmDialog title="Cancel production run?" message={<>Cancel the <strong>{cancelRun.sku_name}</strong> run at {cancelRun.plant_name}?</>} confirmLabel="Cancel run" loading={cancel.isPending} onConfirm={() => cancel.mutate(cancelRun.id)} onCancel={() => setCancelRun(null)} />}
    </>
  );
}

const inputCls = "w-full h-11 rounded-xl border border-input bg-surface px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function ScheduleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { data: plants = [] } = useQuery<any[]>({ queryKey: ["plants"], queryFn: () => staffApi.get("/admin/plants").then((r) => r.data) });
  const { data: skus = [] } = useQuery<any[]>({ queryKey: ["cfg-skus"], queryFn: () => staffApi.get("/admin/config/skus").then((r) => r.data) });
  const [plantId, setPlantId] = useState("");
  const [skuId, setSkuId] = useState("");
  const [units, setUnits] = useState("");
  const [runDate, setRunDate] = useState(new Date().toISOString().split("T")[0]);
  const sku = skus.find((s) => String(s.id) === skuId);
  const hours = sku && sku.target_output_per_shift_hour ? (parseFloat(units || "0") / sku.target_output_per_shift_hour).toFixed(2) : null;
  const save = useMutation({
    mutationFn: () => staffApi.post("/admin/production", { plant_id: +plantId, sku_id: +skuId, planned_units: parseFloat(units) || 0, run_date: runDate }),
    onSuccess: onSaved,
  });
  return (
    <Shell title="Schedule Production Run" onClose={onClose}>
      <Field label="Plant"><select className={inputCls} value={plantId} onChange={(e) => setPlantId(e.target.value)}><option value="">Select…</option>{plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Product"><select className={inputCls} value={skuId} onChange={(e) => setSkuId(e.target.value)}><option value="">Select…</option>{skus.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Units to produce"><input type="number" className={inputCls} value={units} onChange={(e) => setUnits(e.target.value)} /></Field>
        <Field label="Run date"><input type="date" className={inputCls} value={runDate} onChange={(e) => setRunDate(e.target.value)} /></Field>
      </div>
      {hours !== null && <div className="rounded-xl bg-canvas p-3 text-[13px] flex justify-between"><span className="text-ink-3">Estimated hours required</span><span className="font-semibold">{hours} hrs</span></div>}
      {sku && !sku.target_output_per_shift_hour && <div className="text-[12px] text-amber-600">No output rate set for this SKU (set it in Configuration → SKU Recipe).</div>}
      <SaveBtn onClick={() => save.mutate()} saving={save.isPending} disabled={!plantId || !skuId || !units} label="Schedule Run" />
    </Shell>
  );
}

function CompleteModal({ run, onClose, onSaved }: { run: Run; onClose: () => void; onSaved: () => void }) {
  const [units, setUnits] = useState(String(run.planned_units));
  const { data: reqs = [], isLoading } = useQuery<any[]>({ queryKey: ["run-req", run.id], queryFn: () => staffApi.get(`/admin/production/${run.id}/requirements`).then((r) => r.data) });
  const [result, setResult] = useState<any>(null);
  const complete = useMutation({
    mutationFn: () => staffApi.post(`/admin/production/${run.id}/complete`, { produced_units: parseFloat(units) || 0 }).then((r) => r.data),
    onSuccess: (data) => { if (data.warnings?.length) setResult(data); else onSaved(); },
  });
  return (
    <Shell title="Complete Production Run" sub={`${run.sku_name} · ${run.plant_name}`} onClose={onClose}>
      <Field label="Units produced"><input type="number" className={inputCls} value={units} onChange={(e) => setUnits(e.target.value)} /></Field>
      <div>
        <div className="text-[13px] font-semibold text-ink-2 mb-1.5 flex items-center gap-1.5"><FlaskConical size={14} className="text-primary" /> Raw material consumption (BOM)</div>
        {isLoading ? <div className="py-3 flex justify-center"><Loader2 className="size-4 animate-spin text-primary" /></div> :
          reqs.length === 0 ? <p className="text-[13px] text-ink-4">No BOM defined for this product.</p> : (
            <div className="rounded-xl bg-canvas p-3 space-y-1.5">
              {reqs.map((r: any) => (
                <div key={r.material_id} className="flex justify-between text-[13px]">
                  <span className="text-ink-3">{r.material_name}</span>
                  <span className={r.sufficient ? "" : "text-red-600 font-medium"}>{r.needed.toLocaleString()} / {r.available.toLocaleString()} {r.unit}{!r.sufficient && ` (short ${r.shortfall.toLocaleString()})`}</span>
                </div>
              ))}
            </div>
          )}
      </div>
      {result?.warnings?.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[13px] text-amber-800">
          <div className="font-semibold flex items-center gap-1.5 mb-1"><AlertTriangle size={14} /> Completed with shortfalls:</div>
          {result.warnings.map((w: string, i: number) => <div key={i}>· {w}</div>)}
          <button onClick={onSaved} className="mt-2 h-9 px-4 rounded-full bg-amber-500 text-white text-[13px] font-semibold">Done</button>
        </div>
      )}
      {!result && <SaveBtn onClick={() => complete.mutate()} saving={complete.isPending} disabled={!units} label="Complete & Post Stock" />}
    </Shell>
  );
}

function Shell({ title, sub, children, onClose }: { title: string; sub?: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-[460px] rounded-t-2xl sm:rounded-2xl p-6 max-h-[92dvh] overflow-auto" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
        <div className="flex items-start justify-between mb-4"><div><h3 className="text-lg font-bold">{title}</h3>{sub && <p className="text-[13px] text-ink-3">{sub}</p>}</div><button onClick={onClose} className="text-ink-3"><X size={20} /></button></div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">{label}</label>{children}</div>;
}
function SaveBtn({ onClick, saving, disabled, label }: { onClick: () => void; saving: boolean; disabled?: boolean; label: string }) {
  return <button onClick={onClick} disabled={saving || disabled} className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-colors disabled:opacity-60 mt-2">{saving ? <Loader2 className="size-5 animate-spin" /> : label}</button>;
}
