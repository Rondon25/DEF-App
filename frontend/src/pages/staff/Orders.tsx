import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { staffApi } from "../../api";
import { SkeletonList } from "@/components/Skeleton";
import ErrorScreen from "@/components/ErrorScreen";
import { StatusPill, statusLabel } from "@/components/StatusPill";
import { Search, ClipboardList, X, FileDown, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const FILTERS = [
  { label: "All",     value: "" },
  { label: "New",     value: "submitted" },
  { label: "Payment", value: "payment_uploaded" },
  { label: "Active",  value: "confirmed" },
  { label: "Shipped", value: "shipped" },
  { label: "Closed",  value: "closed" },
];

export default function StaffOrders() {
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get("filter") || "");
  const [search, setSearch] = useState("");
  const [showExport, setShowExport] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["staff-orders-all"],
    queryFn: () => staffApi.get("/staff/orders").then((r) => r.data),
    refetchInterval: 20_000,
  });

  const filtered = useMemo(() => {
    let list = orders;
    if (filter) list = list.filter((o: any) => o.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o: any) =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.company_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q)
      );
    }
    return list;
  }, [orders, filter, search]);

  const exportExcel = () => {
    const data = filtered.map((o: any) => ({
      Order: o.order_number,
      Customer: o.customer_name || "",
      Company: o.company_name || "",
      Phone: o.customer_phone || "",
      Status: statusLabel(o.status),
      Date: new Date(o.created_at).toLocaleDateString("en-US"),
      Amount_USD: o.total_amount?.toFixed(2),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 13 }, { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `orders_${today}.xlsx`);
    setShowExport(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(13, 148, 136);
    doc.text("Rohan Energy Solutions — Orders", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })} · ${filtered.length} orders`, 14, 25);
    autoTable(doc, {
      startY: 31,
      head: [["Order #", "Customer", "Status", "Date", "Amount"]],
      body: filtered.map((o: any) => [
        o.order_number, o.customer_name || "", statusLabel(o.status),
        new Date(o.created_at).toLocaleDateString("en-US"), `$${o.total_amount?.toFixed(2)}`,
      ]),
      headStyles: { fillColor: [30, 30, 45], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 4: { halign: "right" } },
    });
    doc.save(`orders_${today}.pdf`);
    setShowExport(false);
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Orders</h1>
          <p className="text-sm text-ink-3">{filtered.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowExport((v) => !v)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border bg-surface text-sm font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            <FileDown size={16} /> Export
          </button>
          {showExport && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
              <div className="absolute right-0 top-12 z-20 w-48 bg-surface rounded-xl shadow-[var(--shadow-lg)] border border-border overflow-hidden">
                <button onClick={exportExcel} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-canvas text-left">
                  <FileSpreadsheet size={16} className="text-green-600" /> Export as Excel
                </button>
                <button onClick={exportPDF} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-canvas text-left border-t border-border">
                  <FileText size={16} className="text-red-600" /> Export as PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3 max-w-lg">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-4" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order #, customer, phone..."
          className="w-full h-11 rounded-full border border-input bg-surface pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-4"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap border-2 transition-colors ${
              filter === f.value ? "bg-primary border-primary text-white" : "bg-surface border-border text-ink-2 hover:border-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonList rows={6} />
      ) : isError ? (
        <ErrorScreen message="Could not load orders." retry={refetch} />
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] px-4 py-12 text-center">
          <div className="size-14 rounded-full bg-canvas flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="size-7 text-ink-4" />
          </div>
          <h3 className="font-bold mb-1">No orders found</h3>
          <p className="text-sm text-ink-3 mb-4">{search ? "Try a different search." : filter ? "No orders with this status." : "Orders will appear here."}</p>
          {search && (
            <button onClick={() => setSearch("")} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-border text-sm font-medium">
              <X className="size-4" /> Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border">
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o: any) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3.5">
                      <Link to={`/staff/orders/${o.id}`} className="font-mono font-semibold text-sm hover:text-primary">{o.order_number}</Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      {o.customer_name}
                      {o.company_name && <span className="text-ink-4"> · {o.company_name}</span>}
                    </td>
                    <td className="px-5 py-3.5"><StatusPill status={o.status} /></td>
                    <td className="px-5 py-3.5 text-sm text-ink-3">{new Date(o.created_at).toLocaleDateString("en-US", { dateStyle: "short" })}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-sm">${o.total_amount?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden">
            {filtered.map((o: any) => (
              <Link key={o.id} to={`/staff/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-canvas">
                <div className="size-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                  <ClipboardList className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-semibold text-sm">{o.order_number}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <StatusPill status={o.status} />
                    <span className="text-xs text-ink-4 truncate">{o.customer_name}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm">${o.total_amount?.toFixed(2)}</div>
                  <div className="text-[11px] text-ink-4">{new Date(o.created_at).toLocaleDateString("en-US", { dateStyle: "short" })}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
