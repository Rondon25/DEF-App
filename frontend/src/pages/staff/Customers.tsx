import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { staffApi } from "../../api";
import ConfirmDialog from "@/components/ConfirmDialog";
import { SkeletonList } from "@/components/Skeleton";
import { Check, X, UserPlus, ChevronRight, Trash2, CreditCard, Loader2 } from "lucide-react";

const STATUS_TONE: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  active:    "bg-green-100 text-green-700",
  suspended: "bg-slate-100 text-slate-600",
  rejected:  "bg-red-100 text-red-700",
};

export default function Customers() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "pending">("all");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [delCustomer, setDelCustomer] = useState<any>(null);

  const { data: pending = [] } = useQuery({
    queryKey: ["pending-customers"],
    queryFn: () => staffApi.get("/customers/pending").then((r) => r.data),
    refetchInterval: 20_000,
  });
  const { data: all = [], isLoading } = useQuery({
    queryKey: ["all-customers"],
    queryFn: () => staffApi.get("/customers").then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => staffApi.post(`/customers/${id}/approve`, {}).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pending-customers"] }); qc.invalidateQueries({ queryKey: ["all-customers"] }); },
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => staffApi.post(`/customers/${id}/reject`, { reason }).then((r) => r.data),
    onSuccess: () => { setRejectId(null); setRejectReason(""); qc.invalidateQueries({ queryKey: ["pending-customers"] }); qc.invalidateQueries({ queryKey: ["all-customers"] }); },
  });
  const archiveMutation = useMutation({
    mutationFn: (id: number) => staffApi.post(`/customers/${id}/archive`, {}).then((r) => r.data),
    onSuccess: () => { setDelCustomer(null); qc.invalidateQueries({ queryKey: ["all-customers"] }); qc.invalidateQueries({ queryKey: ["pending-customers"] }); },
  });

  const list = tab === "pending" ? pending : all;

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-ink">Customers</h1>
        <p className="text-sm text-ink-3">Manage customer accounts and approvals</p>
      </div>

      {/* Approval alert */}
      {pending.length > 0 && tab !== "pending" && (
        <button onClick={() => setTab("pending")}
          className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-4 text-left hover:bg-amber-100/70 transition-colors">
          <span className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shrink-0"><UserPlus size={18} /></span>
          <span className="flex-1">
            <span className="block font-bold text-sm text-amber-900">{pending.length} customer{pending.length > 1 ? "s" : ""} awaiting approval</span>
            <span className="text-[12.5px] text-amber-700">Tap to review and approve new registrations</span>
          </span>
          <ChevronRight size={18} className="text-amber-700" />
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("all")}
          className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border-2 transition-colors ${tab === "all" ? "bg-primary border-primary text-white" : "bg-surface border-border text-ink-2 hover:border-primary"}`}>
          All Customers
        </button>
        <button onClick={() => setTab("pending")}
          className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border-2 transition-colors flex items-center gap-1.5 ${tab === "pending" ? "bg-primary border-primary text-white" : "bg-surface border-border text-ink-2 hover:border-primary"}`}>
          Pending Approval
          {pending.length > 0 && <span className="flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold">{pending.length}</span>}
        </button>
      </div>

      {isLoading ? (
        <SkeletonList rows={6} />
      ) : list.length === 0 ? (
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] px-4 py-12 text-center">
          <div className="size-14 rounded-full bg-canvas flex items-center justify-center mx-auto mb-3"><UserPlus className="size-7 text-ink-4" /></div>
          <h3 className="font-bold mb-1">{tab === "pending" ? "No pending approvals" : "No customers yet"}</h3>
          <p className="text-sm text-ink-3">{tab === "pending" ? "All caught up!" : "Customers appear here after registration."}</p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Registered</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c: any) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3.5">
                      <Link to={`/staff/customers/${c.id}`} className="font-semibold text-sm hover:text-primary">{c.name}</Link>
                      {c.is_credit_account && <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-ink-4"><CreditCard size={11} /> Credit</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-2">{c.company_name || "—"}</td>
                    <td className="px-5 py-3.5 text-sm font-mono text-ink-3">{c.phone_number}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_TONE[c.status] || "bg-slate-100 text-slate-600"}`}>{c.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-3">{new Date(c.created_at).toLocaleDateString("en-US", { dateStyle: "short" })}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.status === "pending" ? (
                          <>
                            <button onClick={() => approveMutation.mutate(c.id)} disabled={approveMutation.isPending}
                              className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-primary text-white text-[12px] font-semibold hover:bg-teal-700 transition-colors">
                              <Check size={13} /> Approve
                            </button>
                            <button onClick={() => { setRejectId(c.id); setRejectReason(""); }}
                              className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-border text-red-600 text-[12px] font-medium hover:bg-red-50 transition-colors">
                              <X size={13} /> Reject
                            </button>
                          </>
                        ) : (
                          <>
                            <Link to={`/staff/customers/${c.id}`} className="inline-flex items-center justify-center size-8 rounded-full border border-border text-ink-4 hover:border-primary hover:text-primary transition-colors">
                              <ChevronRight size={15} />
                            </Link>
                            <button onClick={() => setDelCustomer(c)} title="Archive customer"
                              className="inline-flex items-center justify-center size-8 rounded-full border border-border text-ink-4 hover:border-red-300 hover:text-red-600 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectId !== null && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={() => setRejectId(null)}>
          <div className="w-full max-w-[440px] bg-surface rounded-2xl shadow-[var(--shadow-lg)] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1.5">Reject Customer</h3>
            <p className="text-sm text-ink-3 mb-3">Optionally provide a reason — it will be sent via WhatsApp.</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Reason (optional)"
              className="w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 mb-4" />
            <div className="flex gap-2.5">
              <button onClick={() => setRejectId(null)} className="flex-1 h-11 rounded-full border border-border text-sm font-semibold text-ink-2 hover:bg-canvas">Cancel</button>
              <button onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })} disabled={rejectMutation.isPending}
                className="flex-1 h-11 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 flex items-center justify-center disabled:opacity-60">
                {rejectMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive confirm */}
      {delCustomer && (
        <ConfirmDialog
          title="Archive customer?"
          message={<>This removes <strong>{delCustomer.name}</strong> from the active list. Their order history is kept and they can be restored from the database.</>}
          confirmLabel="Archive"
          loading={archiveMutation.isPending}
          onConfirm={() => archiveMutation.mutate(delCustomer.id)}
          onCancel={() => setDelCustomer(null)}
        />
      )}
    </>
  );
}
