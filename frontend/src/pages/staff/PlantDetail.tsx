import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { staffApi } from "../../api";
import {
  ChevronLeft, Factory, MapPin, User, Phone, Mail, Gauge, Package, Boxes,
  AlertTriangle, Droplet, FileDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useState } from "react";

export default function PlantDetail() {
  const { id } = useParams();
  const [showExport, setShowExport] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const { data: plant, isLoading } = useQuery<any>({
    queryKey: ["plant", id],
    queryFn: () => staffApi.get(`/admin/plants/${id}`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  if (isLoading) return <div className="loading-screen"><span className="spinner spinner-dark" /></div>;
  if (!plant) return <div className="empty-state"><div className="empty-icon"><Factory size={32} /></div><p>Plant not found</p></div>;

  const util = plant.utilization || 0;
  const utilColor = util > 90 ? "var(--color-danger)" : util > 70 ? "var(--color-amber-500)" : "var(--color-teal-600)";
  const products = plant.products || [];
  const maxQty = Math.max(...products.map((p: any) => p.quantity), 1);

  const exportExcel = () => {
    const data = products.map((p: any) => ({ Code: p.sku_code, Product: p.name, Unit: p.unit, Quantity: p.quantity, Status: p.quantity < 10 ? "Low" : "OK" }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plant Stock");
    XLSX.writeFile(wb, `plant_${plant.name.replace(/\s+/g, "_")}_${today}.xlsx`);
    setShowExport(false);
  };
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.setTextColor(13, 148, 136);
    doc.text(`${plant.name} - Stock`, 14, 18);
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text(`${plant.location || ""} · Holding ${plant.current_holding} / ${plant.max_capacity ?? "-"} (${util}%)`, 14, 25);
    autoTable(doc, {
      startY: 31,
      head: [["Code", "Product", "Unit", "Quantity", "Status"]],
      body: products.map((p: any) => [p.sku_code, p.name, p.unit, p.quantity, p.quantity < 10 ? "Low" : "OK"]),
      headStyles: { fillColor: [30, 30, 45], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
    doc.save(`plant_${plant.name.replace(/\s+/g, "_")}_${today}.pdf`);
    setShowExport(false);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/staff/plants" className="flex size-9 items-center justify-center rounded-full border border-border text-ink-3 hover:text-ink hover:border-primary transition-colors"><ChevronLeft className="size-5" /></Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Factory size={20} className="text-primary" /> {plant.name}</h1>
            {plant.location && <div className="text-sm text-ink-3 flex items-center gap-1.5"><MapPin size={13} /> {plant.location}</div>}
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowExport((v) => !v)} disabled={products.length === 0}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border bg-surface text-sm font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
            <FileDown size={16} /> Export
          </button>
          {showExport && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
              <div className="absolute right-0 top-12 z-20 w-44 bg-surface rounded-xl shadow-[var(--shadow-lg)] border border-border overflow-hidden">
                <button onClick={exportExcel} className="w-full px-4 py-3 text-sm hover:bg-canvas text-left">Excel</button>
                <button onClick={exportPDF} className="w-full px-4 py-3 text-sm hover:bg-canvas text-left border-t border-border">PDF</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top: capacity gauge + manager + KPIs */}
      <div className="grid lg:grid-cols-[1.3fr_minmax(0,1fr)] gap-4 mb-5">
        {/* Capacity */}
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Gauge size={17} className="text-primary" /> Capacity Utilization</h3>
          <div className="flex items-end justify-between mb-2">
            <div>
              <span className="text-3xl font-bold">{plant.current_holding.toLocaleString("en-IN")}</span>
              <span className="text-ink-3"> / {plant.max_capacity ? plant.max_capacity.toLocaleString("en-IN") : "—"} units</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: utilColor }}>{util}%</span>
          </div>
          <div className="h-3 rounded-full bg-canvas overflow-hidden">
            <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(100, util)}%`, background: utilColor }} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <Mini label="Products" value={plant.product_count} icon={<Package size={15} />} />
            <Mini label="Holding" value={plant.current_holding.toLocaleString("en-IN")} icon={<Boxes size={15} />} />
            <Mini label="Low stock" value={plant.low_stock ?? 0} warn={(plant.low_stock ?? 0) > 0} icon={<AlertTriangle size={15} />} />
          </div>
        </div>

        {/* Manager */}
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><User size={17} className="text-primary" /> Plant Manager</h3>
          {plant.manager_name ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold">{plant.manager_name[0]?.toUpperCase()}</div>
                <div className="font-semibold">{plant.manager_name}</div>
              </div>
              {plant.manager_phone && <a href={`tel:${plant.manager_phone}`} className="flex items-center gap-2.5 text-sm text-ink-2 hover:text-primary"><span className="flex size-8 items-center justify-center rounded-lg bg-canvas text-ink-4"><Phone size={14} /></span><span className="font-mono">{plant.manager_phone}</span></a>}
              {plant.manager_email && <a href={`mailto:${plant.manager_email}`} className="flex items-center gap-2.5 text-sm text-ink-2 hover:text-primary"><span className="flex size-8 items-center justify-center rounded-lg bg-canvas text-ink-4"><Mail size={14} /></span>{plant.manager_email}</a>}
            </div>
          ) : (
            <p className="text-sm text-ink-4 py-4">No manager assigned. Edit the plant to add a contact.</p>
          )}
        </div>
      </div>

      {/* Products held */}
      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="px-5 pt-5 pb-2 font-bold">Products at this Plant <span className="text-ink-4 font-normal text-sm">({products.length})</span></div>
        {products.length === 0 ? (
          <div className="px-5 py-10 text-center text-ink-4">No stock recorded at this plant yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3 w-[240px]">Quantity</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
                  <tr key={p.sku_id} className="border-b border-border last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-teal-50 flex items-center justify-center text-primary shrink-0"><Droplet size={16} /></div>
                        <div><div className="font-semibold text-sm">{p.name}</div><div className="text-[12px] font-mono text-ink-4">{p.sku_code}</div></div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(3, (p.quantity / maxQty) * 100)}%` }} /></div>
                        <span className="font-bold text-sm w-20 text-right">{p.quantity} <span className="text-ink-4 font-normal text-xs">{p.unit}</span></span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.quantity <= 0 ? <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">Out</span>
                        : p.quantity < 10 ? <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Low</span>
                        : <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">In stock</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Mini({ label, value, icon, warn }: { label: string; value: React.ReactNode; icon: React.ReactNode; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-canvas p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-ink-3 font-medium mb-1"><span className={warn ? "text-amber-600" : "text-ink-4"}>{icon}</span> {label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
