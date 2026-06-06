import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";
import {
  TrendingUp, CalendarDays, ChevronLeft, ChevronRight, Check, Loader2, Zap,
  FileDown, FileSpreadsheet, FileText, BarChart3,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function weekStart(d: Date) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x; }
function iso(d: Date) { return d.toISOString().split("T")[0]; }

export default function Forecast() {
  const qc = useQueryClient();
  const today = new Date();
  const [start, setStart] = useState(() => weekStart(today));
  const [plantId, setPlantId] = useState<number | null>(null);
  const [showExport, setShowExport] = useState(false);
  const month = iso(today).slice(0, 7);

  const { data: plants = [] } = useQuery<any[]>({ queryKey: ["plants"], queryFn: () => staffApi.get("/admin/plants").then((r) => r.data) });
  const activePlant = plantId ?? plants[0]?.id ?? null;
  const end = useMemo(() => { const e = new Date(start); e.setDate(e.getDate() + 6); return e; }, [start]);

  const { data: grid } = useQuery<any>({
    queryKey: ["forecast", activePlant, iso(start)],
    queryFn: () => staffApi.get(`/admin/forecast?plant_id=${activePlant}&start=${iso(start)}&end=${iso(end)}`).then((r) => r.data),
    enabled: !!activePlant,
  });
  const { data: summary } = useQuery<any>({ queryKey: ["forecast-summary", month], queryFn: () => staffApi.get(`/admin/forecast/summary?month=${month}`).then((r) => r.data), refetchInterval: 30_000 });

  const save = useMutation({
    mutationFn: (b: any) => staffApi.post("/admin/forecast", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["forecast"] }); qc.invalidateQueries({ queryKey: ["forecast-summary"] }); },
  });
  const applyUsage = useMutation({
    mutationFn: () => staffApi.post(`/admin/forecast/apply-to-usage?month=${month}`, {}).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rm-stock"] }); qc.invalidateQueries({ queryKey: ["rm-summary"] }); },
  });

  const dates: string[] = grid?.dates ?? [];
  const skus: any[] = grid?.skus ?? [];
  const values = grid?.values ?? {};

  const exportExcel = () => {
    const data = (summary?.by_sku ?? []).map((r: any) => ({ SKU: r.sku_code, Product: r.name, "Monthly Units": r.units, "Avg Daily": r.avg_daily }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Forecast"); XLSX.writeFile(wb, `forecast_${month}.xlsx`); setShowExport(false);
  };
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.setTextColor(13, 148, 136); doc.text(`Sales Forecast — ${month}`, 14, 18);
    doc.setFontSize(10); doc.setTextColor(120); doc.text(`Total ${summary?.total_units ?? 0} units · ${summary?.working_days ?? 0} working days`, 14, 25);
    autoTable(doc, { startY: 31, head: [["SKU", "Product", "Monthly Units", "Avg Daily"]],
      body: (summary?.by_sku ?? []).map((r: any) => [r.sku_code, r.name, r.units, r.avg_daily]),
      headStyles: { fillColor: [30, 30, 45], textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [248, 249, 250] }, styles: { fontSize: 9, cellPadding: 3 } });
    doc.save(`forecast_${month}.pdf`); setShowExport(false);
  };

  const shift = (days: number) => { const s = new Date(start); s.setDate(s.getDate() + days); setStart(s); };

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Sales Forecast</h1>
        <p className="text-sm text-ink-3">Expected daily demand by product &amp; plant — drives reorder &amp; production planning</p>
      </div>

      {/* Monthly KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Kpi featured label={`Forecast (${month})`} value={summary ? Number(summary.total_units).toLocaleString() : "—"} icon={<TrendingUp className="size-4" />} />
        <Kpi label="Working Days" value={summary?.working_days ?? "—"} icon={<CalendarDays className="size-4" />} />
        <Kpi label="Avg Daily" value={summary && summary.working_days ? Math.round(summary.total_units / summary.working_days).toLocaleString() : "—"} icon={<BarChart3 className="size-4" />} />
        <Kpi label="Top SKU" value={summary?.by_sku?.[0]?.sku_code ?? "—"} icon={<Zap className="size-4" />} />
      </div>

      {/* controls */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <select value={activePlant ?? ""} onChange={(e) => setPlantId(+e.target.value)} className="h-10 rounded-full border border-input bg-surface px-4 text-sm outline-none focus:border-primary">
            {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex items-center gap-1 bg-surface border border-border rounded-full px-1 h-10">
            <button onClick={() => shift(-7)} className="size-8 rounded-full flex items-center justify-center text-ink-3 hover:text-primary"><ChevronLeft size={16} /></button>
            <span className="text-[13px] font-medium px-2 whitespace-nowrap">{iso(start)} → {iso(end)}</span>
            <button onClick={() => shift(7)} className="size-8 rounded-full flex items-center justify-center text-ink-3 hover:text-primary"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => applyUsage.mutate()} disabled={applyUsage.isPending}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60" title="Convert forecast into raw-material average daily usage for reorder points">
            {applyUsage.isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />} Apply to Usage
          </button>
          <div className="relative">
            <button onClick={() => setShowExport((v) => !v)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border bg-surface text-sm font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors"><FileDown size={16} /> Export</button>
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

      {applyUsage.data && <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-[13px] text-green-800">{applyUsage.data.message}</div>}

      {/* Weekly grid */}
      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border">
                <th className="px-4 py-3 sticky left-0 bg-surface">Product</th>
                {dates.map((d) => { const dd = new Date(d); const wknd = dd.getDay() === 0; return <th key={d} className={`px-2 py-3 text-center ${wknd ? "text-ink-4/50" : ""}`}>{dd.toLocaleDateString("en-US", { weekday: "short" })}<div className="font-normal text-[10px]">{dd.getDate()}</div></th>; })}
                <th className="px-3 py-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {skus.map((s) => {
                const rowTotal = dates.reduce((sum, d) => sum + (values[s.id]?.[d] ?? 0), 0);
                return (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 sticky left-0 bg-surface"><div className="font-semibold text-sm">{s.code}</div><div className="text-[11px] text-ink-4">{s.name}</div></td>
                    {dates.map((d) => (
                      <td key={d} className="px-1.5 py-2 text-center">
                        <Cell key={`${s.id}-${d}-${values[s.id]?.[d] ?? 0}`} value={values[s.id]?.[d] ?? 0} onSave={(v) => save.mutate({ plant_id: activePlant, sku_id: s.id, forecast_date: d, forecast_units: v })} />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold text-sm">{rowTotal.toLocaleString()}</td>
                  </tr>
                );
              })}
              {skus.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-ink-4">Select a plant to enter forecast</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly rollup by SKU */}
      <h3 className="font-bold mb-3 flex items-center gap-2"><BarChart3 size={17} className="text-primary" /> Monthly Demand by Product</h3>
      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
        <table className="w-full min-w-[480px]">
          <thead><tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border"><th className="px-5 py-3">Product</th><th className="px-5 py-3 w-[40%]">Monthly Units</th><th className="px-5 py-3">Avg Daily</th></tr></thead>
          <tbody>
            {(summary?.by_sku ?? []).map((r: any) => {
              const max = summary.by_sku[0]?.units || 1;
              return (
                <tr key={r.sku_id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3"><div className="font-semibold text-sm">{r.name}</div><div className="text-[12px] font-mono text-ink-4">{r.sku_code}</div></td>
                  <td className="px-5 py-3"><div className="flex items-center gap-2"><div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(3, (r.units / max) * 100)}%` }} /></div><span className="text-sm font-semibold w-16 text-right">{r.units.toLocaleString()}</span></div></td>
                  <td className="px-5 py-3 text-sm">{r.avg_daily.toLocaleString()}</td>
                </tr>
              );
            })}
            {(!summary || summary.by_sku.length === 0) && <tr><td colSpan={3} className="px-5 py-10 text-center text-ink-4">No forecast data for {month}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Cell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value || ""));
  const [saved, setSaved] = useState(false);
  return (
    <div className="relative">
      <input value={v} onChange={(e) => setV(e.target.value)}
        onBlur={() => { const n = parseFloat(v) || 0; if (n !== value) { onSave(n); setSaved(true); setTimeout(() => setSaved(false), 1000); } }}
        className="w-14 h-8 rounded-lg border border-input bg-surface text-center text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      {saved && <Check size={11} className="text-green-600 absolute -right-1 -top-1" />}
    </div>
  );
}

function Kpi({ featured, label, value, icon }: { featured?: boolean; label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className={`rounded-2xl p-5 ${featured ? "bg-sidebar text-white" : "bg-surface shadow-[var(--shadow-sm)]"}`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[13px] font-medium ${featured ? "text-white/60" : "text-ink-3"}`}>{label}</span>
        <span className={`flex size-7 items-center justify-center rounded-lg ${featured ? "bg-white/10 text-accent" : "bg-teal-50 text-primary"}`}>{icon}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
