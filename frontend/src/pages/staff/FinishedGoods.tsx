import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";
import { SkeletonList } from "@/components/Skeleton";
import StatCard from "@/components/ui/StatCard";
import {
  Factory, Truck, DollarSign, TrendingUp, X, Loader2, Plus, Minus,
  FileDown, FileSpreadsheet, FileText, History,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const STATUS = {
  critical: { text: "text-red-700", bg: "bg-red-100", dot: "bg-red-500", label: "Below safety" },
  warning:  { text: "text-amber-700", bg: "bg-amber-100", dot: "bg-amber-500", label: "Low" },
  ok:       { text: "text-green-700", bg: "bg-green-100", dot: "bg-green-500", label: "OK" },
};

export default function FinishedGoods() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [days, setDays] = useState(30);
  const [showEntry, setShowEntry] = useState<null | "production" | "dispatch">(null);
  const [showLedger, setShowLedger] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const { data: summary, isLoading } = useQuery<any>({ queryKey: ["fg-summary", days], queryFn: () => staffApi.get(`/admin/fg/summary?days=${days}`).then((r) => r.data), refetchInterval: 30_000 });
  const inv = () => { qc.invalidateQueries({ queryKey: ["fg-summary"] }); qc.invalidateQueries({ queryKey: ["fg-ledger"] }); qc.invalidateQueries({ queryKey: ["stock"] }); };

  const rows = summary?.status_rows ?? [];
  const exportExcel = () => {
    const data = rows.map((r: any) => ({ SKU: r.sku_code, Product: r.name, Stock: r.qty, "Min Safety": r.min_safety, Status: STATUS[r.status as keyof typeof STATUS].label }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Finished Goods");
    XLSX.writeFile(wb, `finished_goods_${today}.xlsx`); setShowExport(false);
  };
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.setTextColor(13, 148, 136); doc.text("Finished Goods Inventory", 14, 18);
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text(`Last ${days}d · Produced ${summary?.produced ?? 0} · Dispatched ${summary?.dispatched ?? 0} · Revenue Rs ${summary?.revenue ?? 0}`, 14, 25);
    autoTable(doc, { startY: 31,
      head: [["SKU", "Product", "Stock", "Min Safety", "Status"]],
      body: rows.map((r: any) => [r.sku_code, r.name, r.qty, r.min_safety, STATUS[r.status as keyof typeof STATUS].label]),
      headStyles: { fillColor: [30, 30, 45], textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [248, 249, 250] }, styles: { fontSize: 9, cellPadding: 3 } });
    doc.save(`finished_goods_${today}.pdf`); setShowExport(false);
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Finished Goods</h1>
          <p className="text-sm text-ink-3">Production, dispatch &amp; inventory economics</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`h-9 px-3.5 rounded-full text-[13px] font-medium transition-colors ${days === d ? "bg-primary text-white" : "bg-surface border border-border text-ink-2 hover:border-primary"}`}>{d}d</button>
          ))}
        </div>
      </div>

      {/* Economics KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label={`Produced (${days}d)`} value={summary ? Number(summary.produced).toLocaleString() : "—"} icon={<Factory className="size-4" />} />
        <StatCard label={`Dispatched (${days}d)`} value={summary ? Number(summary.dispatched).toLocaleString() : "—"} icon={<Truck className="size-4" />} />
        <StatCard label={`Revenue (${days}d)`} value={summary ? `₹${Number(summary.revenue).toLocaleString()}` : "—"} icon={<DollarSign className="size-4" />} />
        <StatCard label="Gross Margin" value={summary ? `₹${Number(summary.gross_margin).toLocaleString()}` : "—"} icon={<TrendingUp className="size-4" />} />
      </div>

      {/* actions */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="text-sm text-ink-3">{summary?.below_safety ? <span className="text-amber-600 font-medium">{summary.below_safety} product(s) at/below safety stock</span> : "All products above safety stock"}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLedger(true)} className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full border border-border bg-surface text-sm font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors"><History size={16} /> Ledger</button>
          <div className="relative">
            <button onClick={() => setShowExport((v) => !v)} className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full border border-border bg-surface text-sm font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors"><FileDown size={16} /> Export</button>
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
          <button onClick={() => setShowEntry("dispatch")} className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full border border-border bg-surface text-sm font-semibold text-ink-2 hover:border-red-300 hover:text-red-600 transition-colors"><Minus size={16} /> Dispatch</button>
          <button onClick={() => setShowEntry("production")} className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-teal-700 transition-colors"><Plus size={16} /> Record Production</button>
        </div>
      </div>

      {/* FG status table */}
      {isLoading ? <SkeletonList rows={6} /> : (
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead><tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border">
                <th className="px-5 py-3">Product</th><th className="px-5 py-3">In Stock</th><th className="px-5 py-3">Min Safety</th><th className="px-5 py-3">Status</th>
              </tr></thead>
              <tbody>
                {rows.map((r: any) => {
                  const s = STATUS[r.status as keyof typeof STATUS];
                  return (
                    <tr key={r.sku_code} className="border-b border-border last:border-0 hover:bg-canvas">
                      <td className="px-5 py-3.5"><div className="font-semibold text-sm">{r.name}</div><div className="text-[12px] font-mono text-ink-4">{r.sku_code}</div></td>
                      <td className="px-5 py-3.5 text-sm font-semibold">{r.qty.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-sm text-ink-3">{r.min_safety.toLocaleString()}</td>
                      <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${s.bg} ${s.text}`}><span className={`size-1.5 rounded-full ${s.dot}`} /> {s.label}</span></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-ink-4">No products configured</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showEntry && <EntryModal mode={showEntry} onClose={() => setShowEntry(null)} onSaved={() => { inv(); setShowEntry(null); }} />}
      {showLedger && <LedgerModal onClose={() => setShowLedger(false)} />}
    </>
  );
}

const inputCls = "w-full h-11 rounded-xl border border-input bg-surface px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function EntryModal({ mode, onClose, onSaved }: { mode: "production" | "dispatch"; onClose: () => void; onSaved: () => void }) {
  const { data: plants = [] } = useQuery<any[]>({ queryKey: ["plants"], queryFn: () => staffApi.get("/admin/plants").then((r) => r.data) });
  const { data: skus = [] } = useQuery<any[]>({ queryKey: ["cfg-skus"], queryFn: () => staffApi.get("/admin/config/skus").then((r) => r.data) });
  const [plantId, setPlantId] = useState("");
  const [skuId, setSkuId] = useState("");
  const [qty, setQty] = useState("");
  const save = useMutation({
    mutationFn: () => staffApi.post(`/admin/fg/${mode}`, { plant_id: +plantId, sku_id: +skuId, quantity: parseFloat(qty) || 0 }),
    onSuccess: onSaved,
  });
  const isProd = mode === "production";
  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-[440px] rounded-t-2xl sm:rounded-2xl p-6 max-h-[92dvh] overflow-auto" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">{isProd ? "Record Production" : "Record Dispatch"}</h3><button onClick={onClose} className="text-ink-3"><X size={20} /></button></div>
        <div className="space-y-3">
          <Field label="Plant"><select className={inputCls} value={plantId} onChange={(e) => setPlantId(e.target.value)}><option value="">Select…</option>{plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Product"><select className={inputCls} value={skuId} onChange={(e) => setSkuId(e.target.value)}><option value="">Select…</option>{skus.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select></Field>
          <Field label={isProd ? "Quantity produced" : "Quantity dispatched"}><input type="number" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending || !plantId || !skuId || !qty} className={`w-full h-12 rounded-full text-white font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 mt-5 ${isProd ? "bg-primary hover:bg-teal-700" : "bg-red-500 hover:bg-red-600"}`}>
          {save.isPending ? <Loader2 className="size-5 animate-spin" /> : isProd ? <><Plus size={16} /> Record Production</> : <><Minus size={16} /> Record Dispatch</>}
        </button>
      </div>
    </div>
  );
}

function LedgerModal({ onClose }: { onClose: () => void }) {
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["fg-ledger"], queryFn: () => staffApi.get("/admin/fg/ledger").then((r) => r.data) });
  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-[680px] rounded-t-2xl sm:rounded-2xl p-6 max-h-[92dvh] overflow-auto" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">Finished Goods Ledger</h3><button onClick={onClose} className="text-ink-3"><X size={20} /></button></div>
        {isLoading ? <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin text-primary" /></div> :
          data.length === 0 ? <p className="text-sm text-ink-4 py-6 text-center">No movements recorded yet</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead><tr className="text-left text-[11px] font-bold uppercase text-ink-4 border-b border-border"><th className="py-2 px-2">Date</th><th className="py-2 px-2">Product</th><th className="py-2 px-2">Plant</th><th className="py-2 px-2 text-green-600">In</th><th className="py-2 px-2 text-red-600">Out</th><th className="py-2 px-2">Close</th><th className="py-2 px-2">Reason</th></tr></thead>
                <tbody>
                  {data.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 text-ink-3">{m.date}</td>
                      <td className="py-2 px-2"><span className="font-mono text-[12px]">{m.sku_code}</span></td>
                      <td className="py-2 px-2 text-ink-3">{m.plant_name}</td>
                      <td className="py-2 px-2 text-green-600">{m.qty_in ? `+${m.qty_in}` : ""}</td>
                      <td className="py-2 px-2 text-red-600">{m.qty_out ? `-${m.qty_out}` : ""}</td>
                      <td className="py-2 px-2 font-semibold">{m.closing.toLocaleString()}</td>
                      <td className="py-2 px-2"><span className="text-[11px] px-2 py-0.5 rounded-full bg-canvas capitalize">{m.reason}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">{label}</label>{children}</div>;
}
