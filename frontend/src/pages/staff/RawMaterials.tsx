import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";
import { SkeletonList } from "@/components/Skeleton";
import StatCard from "@/components/ui/StatCard";
import {
  Boxes, AlertTriangle, ShoppingCart, DollarSign, Search, X, Loader2,
  FileDown, FileSpreadsheet, FileText, Pencil, History, Plus, Minus, ClipboardCheck,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RmRow {
  id: number; plant_id: number; plant_name: string; material_id: number; material_name: string; unit: string;
  quantity: number; avg_daily_usage: number; lead_time_days: number; safety_stock: number; reorder_point: number;
  days_of_cover: number | null; status: "critical" | "warning" | "ok"; order_required: boolean;
  suggested_qty: number; moq: number; unit_cost: number; vendor_name: string | null;
}

const STATUS = {
  critical: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-100", label: "Below ROP" },
  warning:  { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-100", label: "Warning" },
  ok:       { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-100", label: "OK" },
};

export default function RawMaterials() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [search, setSearch] = useState("");
  const [plantFilter, setPlantFilter] = useState<number | "all">("all");
  const [showExport, setShowExport] = useState(false);
  const [editRow, setEditRow] = useState<RmRow | null>(null);
  const [moveRow, setMoveRow] = useState<RmRow | null>(null);
  const [ledgerRow, setLedgerRow] = useState<RmRow | null>(null);

  const { data: rows = [], isLoading } = useQuery<RmRow[]>({
    queryKey: ["rm-stock"], queryFn: () => staffApi.get("/admin/rm-stock").then((r) => r.data), refetchInterval: 30_000,
  });
  const { data: summary } = useQuery<any>({ queryKey: ["rm-summary"], queryFn: () => staffApi.get("/admin/rm-stock/summary").then((r) => r.data), refetchInterval: 30_000 });
  const { data: plants = [] } = useQuery<any[]>({ queryKey: ["plants"], queryFn: () => staffApi.get("/admin/plants").then((r) => r.data) });

  const inv = () => { qc.invalidateQueries({ queryKey: ["rm-stock"] }); qc.invalidateQueries({ queryKey: ["rm-summary"] }); };

  const filtered = useMemo(() => {
    return rows.filter((r) =>
      (plantFilter === "all" || r.plant_id === plantFilter) &&
      (!search.trim() || r.material_name.toLowerCase().includes(search.toLowerCase()) || r.plant_name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [rows, search, plantFilter]);

  const exportExcel = () => {
    const data = filtered.map((r) => ({ Plant: r.plant_name, Material: r.material_name, Stock: r.quantity, Unit: r.unit, "Avg Daily Usage": r.avg_daily_usage, "Lead Time": r.lead_time_days, "Safety Stock": r.safety_stock, ROP: r.reorder_point, "Days Cover": r.days_of_cover ?? "", Status: STATUS[r.status].label, "Order Req": r.order_required ? "YES" : "NO", "Suggested Qty": r.suggested_qty, Vendor: r.vendor_name || "" }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Raw Materials");
    XLSX.writeFile(wb, `raw_materials_${today}.xlsx`); setShowExport(false);
  };
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16); doc.setTextColor(13, 148, 136); doc.text("Raw Material Inventory", 14, 16);
    doc.setFontSize(10); doc.setTextColor(120); doc.text(`Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}`, 14, 22);
    autoTable(doc, { startY: 28,
      head: [["Plant", "Material", "Stock", "ADU", "Lead", "ROP", "Cover", "Status", "Order", "Sugg."]],
      body: filtered.map((r) => [r.plant_name, r.material_name, r.quantity, r.avg_daily_usage, r.lead_time_days, r.reorder_point, r.days_of_cover ?? "-", STATUS[r.status].label, r.order_required ? "YES" : "", r.suggested_qty || ""]),
      headStyles: { fillColor: [30, 30, 45], textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [248, 249, 250] }, styles: { fontSize: 8, cellPadding: 2 } });
    doc.save(`raw_materials_${today}.pdf`); setShowExport(false);
  };

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Raw Materials</h1>
        <p className="text-sm text-ink-3">Daily stock, reorder points &amp; procurement signals</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Stock Lines" value={summary?.total_lines ?? "—"} icon={<Boxes className="size-4" />} />
        <StatCard label="Critical (below ROP)" value={summary?.critical ?? "—"} icon={<AlertTriangle className="size-4" />} warn={(summary?.critical ?? 0) > 0} />
        <StatCard label="Reorder Signals" value={summary?.order_lines ?? "—"} icon={<ShoppingCart className="size-4" />} />
        <StatCard label="Inventory Value" value={summary ? `₹${Number(summary.inventory_value).toLocaleString("en-IN")}` : "—"} icon={<DollarSign className="size-4" />} />
      </div>

      {/* Search + plant filter + export */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search material or plant..."
              className="w-full h-11 rounded-full border border-input bg-surface pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-4" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={plantFilter} onChange={(e) => setPlantFilter(e.target.value === "all" ? "all" : +e.target.value)}
            className="h-11 rounded-full border border-input bg-surface px-4 text-sm outline-none focus:border-primary">
            <option value="all">All plants</option>
            {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="relative">
            <button onClick={() => setShowExport((v) => !v)} disabled={filtered.length === 0}
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
        </div>
      </div>

      {/* Table */}
      {isLoading ? <SkeletonList rows={6} /> : (
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border">
                  <th className="px-4 py-3">Material</th><th className="px-4 py-3">Plant</th>
                  <th className="px-4 py-3">Stock</th><th className="px-4 py-3">ROP</th>
                  <th className="px-4 py-3 w-[150px]">Days Cover</th><th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reorder</th><th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const s = STATUS[r.status];
                  const coverPct = r.days_of_cover != null ? Math.min(100, (r.days_of_cover / 60) * 100) : 0;
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-canvas">
                      <td className="px-4 py-3"><div className="font-semibold text-sm">{r.material_name}</div><div className="text-[12px] text-ink-4">{r.vendor_name || "No vendor"}</div></td>
                      <td className="px-4 py-3 text-sm text-ink-2">{r.plant_name}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{r.quantity.toLocaleString("en-IN")} <span className="text-ink-4 font-normal text-xs">{r.unit}</span></td>
                      <td className="px-4 py-3 text-sm text-ink-3">{r.reorder_point.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden"><div className={`h-2 rounded-full ${s.dot}`} style={{ width: `${Math.max(4, coverPct)}%` }} /></div>
                          <span className="text-[12px] font-semibold w-12 text-right">{r.days_of_cover != null ? `${r.days_of_cover}d` : "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${s.bg} ${s.text}`}><span className={`size-1.5 rounded-full ${s.dot}`} /> {s.label}</span></td>
                      <td className="px-4 py-3 text-sm">{r.order_required ? <span className="font-semibold text-red-600">+{r.suggested_qty.toLocaleString("en-IN")}</span> : <span className="text-ink-4">—</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setLedgerRow(r)} title="Ledger" className="size-8 rounded-full border border-border flex items-center justify-center text-ink-4 hover:border-primary hover:text-primary transition-colors"><History size={14} /></button>
                          <button onClick={() => setMoveRow(r)} title="Record movement" className="size-8 rounded-full border border-border flex items-center justify-center text-ink-4 hover:border-primary hover:text-primary transition-colors"><ClipboardCheck size={14} /></button>
                          <button onClick={() => setEditRow(r)} title="Set stock" className="size-8 rounded-full border border-border flex items-center justify-center text-ink-4 hover:border-primary hover:text-primary transition-colors"><Pencil size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-4">No raw-material stock lines{search ? " match your search" : " — set capacity in Configuration first"}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editRow && <SetStockModal row={editRow} onClose={() => setEditRow(null)} onSaved={() => { inv(); setEditRow(null); }} />}
      {moveRow && <MovementModal row={moveRow} onClose={() => setMoveRow(null)} onSaved={() => { inv(); setMoveRow(null); }} />}
      {ledgerRow && <LedgerDrawer row={ledgerRow} onClose={() => setLedgerRow(null)} />}
    </>
  );
}

const inputCls = "w-full h-11 rounded-xl border border-input bg-surface px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function SetStockModal({ row, onClose, onSaved }: { row: RmRow; onClose: () => void; onSaved: () => void }) {
  const [qty, setQty] = useState(String(row.quantity));
  const [adu, setAdu] = useState(String(row.avg_daily_usage));
  const save = useMutation({
    mutationFn: () => staffApi.post("/admin/rm-stock", { plant_id: row.plant_id, material_id: row.material_id, quantity: parseFloat(qty) || 0, avg_daily_usage: parseFloat(adu) || 0 }),
    onSuccess: onSaved,
  });
  return (
    <Shell title={`Set Stock — ${row.material_name}`} sub={row.plant_name} onClose={onClose}>
      <Field label={`Current stock (${row.unit})`}><input type="number" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
      <Field label="Avg daily usage"><input type="number" className={inputCls} value={adu} onChange={(e) => setAdu(e.target.value)} /></Field>
      <SaveBtn onClick={() => save.mutate()} saving={save.isPending} />
    </Shell>
  );
}

function MovementModal({ row, onClose, onSaved }: { row: RmRow; onClose: () => void; onSaved: () => void }) {
  const [dir, setDir] = useState<"in" | "out">("in");
  const [amt, setAmt] = useState("");
  const [reason, setReason] = useState("receipt");
  const save = useMutation({
    mutationFn: () => staffApi.post("/admin/rm-stock/movement", { plant_id: row.plant_id, material_id: row.material_id, qty_in: dir === "in" ? parseFloat(amt) || 0 : 0, qty_out: dir === "out" ? parseFloat(amt) || 0 : 0, reason }),
    onSuccess: onSaved,
  });
  return (
    <Shell title={`Record Movement — ${row.material_name}`} sub={`${row.plant_name} · current ${row.quantity.toLocaleString("en-IN")} ${row.unit}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => { setDir("in"); setReason("receipt"); }} className={`h-11 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 ${dir === "in" ? "border-primary bg-teal-50 text-primary" : "border-border text-ink-3"}`}><Plus size={15} /> Receipt (in)</button>
        <button onClick={() => { setDir("out"); setReason("usage"); }} className={`h-11 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 ${dir === "out" ? "border-red-300 bg-red-50 text-red-600" : "border-border text-ink-3"}`}><Minus size={15} /> Usage (out)</button>
      </div>
      <Field label="Quantity"><input type="number" className={inputCls} value={amt} onChange={(e) => setAmt(e.target.value)} autoFocus /></Field>
      <Field label="Reason"><select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>{(dir === "in" ? ["receipt", "adjustment", "return"] : ["usage", "adjustment", "wastage"]).map((x) => <option key={x} value={x} className="capitalize">{x}</option>)}</select></Field>
      <SaveBtn onClick={() => save.mutate()} saving={save.isPending} disabled={!amt} label="Post Movement" />
    </Shell>
  );
}

function LedgerDrawer({ row, onClose }: { row: RmRow; onClose: () => void }) {
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["rm-ledger", row.id], queryFn: () => staffApi.get(`/admin/rm-stock/${row.id}/ledger`).then((r) => r.data) });
  return (
    <Shell title={`Ledger — ${row.material_name}`} sub={row.plant_name} onClose={onClose} wide>
      {isLoading ? <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin text-primary" /></div> :
        data.length === 0 ? <p className="text-sm text-ink-4 py-6 text-center">No movements recorded yet</p> : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] font-bold uppercase text-ink-4 border-b border-border"><th className="py-2 px-1">Date</th><th className="py-2 px-1">Open</th><th className="py-2 px-1 text-green-600">In</th><th className="py-2 px-1 text-red-600">Out</th><th className="py-2 px-1">Close</th><th className="py-2 px-1">Reason</th></tr></thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="py-2 px-1 text-ink-3">{m.date}</td><td className="py-2 px-1">{m.opening.toLocaleString("en-IN")}</td>
                    <td className="py-2 px-1 text-green-600">{m.qty_in ? `+${m.qty_in.toLocaleString("en-IN")}` : ""}</td>
                    <td className="py-2 px-1 text-red-600">{m.qty_out ? `-${m.qty_out.toLocaleString("en-IN")}` : ""}</td>
                    <td className="py-2 px-1 font-semibold">{m.closing.toLocaleString("en-IN")}</td>
                    <td className="py-2 px-1"><span className="text-[11px] px-2 py-0.5 rounded-full bg-canvas capitalize">{m.reason}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </Shell>
  );
}

// shared
function Shell({ title, sub, children, onClose, wide }: { title: string; sub?: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className={`bg-surface w-full ${wide ? "sm:max-w-[600px]" : "sm:max-w-[440px]"} rounded-t-2xl sm:rounded-2xl p-6 max-h-[92dvh] overflow-auto`} onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
        <div className="flex items-start justify-between mb-4"><div><h3 className="text-lg font-bold">{title}</h3>{sub && <p className="text-[13px] text-ink-3">{sub}</p>}</div><button onClick={onClose} className="text-ink-3"><X size={20} /></button></div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">{label}</label>{children}</div>;
}
function SaveBtn({ onClick, saving, disabled, label = "Save" }: { onClick: () => void; saving: boolean; disabled?: boolean; label?: string }) {
  return <button onClick={onClick} disabled={saving || disabled} className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-colors disabled:opacity-60 mt-2">{saving ? <Loader2 className="size-5 animate-spin" /> : label}</button>;
}
