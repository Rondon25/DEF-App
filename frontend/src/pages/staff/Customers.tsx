import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { staffApi } from "../../api";
import { Check, X, Users, CheckCircle2, CreditCard, MapPin, UserPlus, ChevronRight } from "lucide-react";

const ic = { display: "inline", verticalAlign: "-3px", marginRight: 5 } as const;

const STATUS_BADGE: Record<string, string> = {
  pending:   "badge-amber",
  active:    "badge-green",
  suspended: "badge-gray",
  rejected:  "badge-gray",
};

export default function Customers() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "all">("all");
  const [rejectId, setRejectId]     = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ["pending-customers"],
    queryFn: () => staffApi.get("/customers/pending").then(r => r.data),
    refetchInterval: 20_000,
  });

  const { data: all = [], isLoading: loadingAll } = useQuery({
    queryKey: ["all-customers"],
    queryFn: () => staffApi.get("/customers").then(r => r.data),
    enabled: tab === "all",
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) =>
      staffApi.post(`/customers/${id}/approve`, {}).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-customers"] });
      qc.invalidateQueries({ queryKey: ["all-customers"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      staffApi.post(`/customers/${id}/reject`, { reason }).then(r => r.data),
    onSuccess: () => {
      setRejectId(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["pending-customers"] });
      qc.invalidateQueries({ queryKey: ["all-customers"] });
    },
  });

  const list   = tab === "pending" ? pending : all;
  const loading = tab === "pending" ? loadingPending : loadingAll;

  return (
    <>
      <div className="page-header">
        <h1>Customers</h1>
        <p>Manage customer accounts and approvals</p>
      </div>

      {/* Approval alert */}
      {pending.length > 0 && tab !== "pending" && (
        <button
          onClick={() => setTab("pending")}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 12,
            background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "var(--radius-lg)",
            padding: "14px 16px", marginBottom: 16, cursor: "pointer", textAlign: "left",
          }}
        >
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 10, background: "#fef3c7", color: "#b45309", flexShrink: 0,
          }}>
            <UserPlus size={18} />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#92400e", display: "block" }}>
              {pending.length} customer{pending.length > 1 ? "s" : ""} awaiting approval
            </span>
            <span style={{ fontSize: 12.5, color: "#b45309" }}>Tap to review and approve new registrations</span>
          </span>
          <ChevronRight size={18} color="#b45309" />
        </button>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${tab === "pending" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("pending")}
          style={{ position: "relative" }}
        >
          Pending Approval
          {pending.length > 0 && (
            <span style={{
              background: "var(--red, #ef4444)", color: "#fff",
              borderRadius: 99, fontSize: 11, fontWeight: 700,
              padding: "1px 6px", marginLeft: 6,
            }}>
              {pending.length}
            </span>
          )}
        </button>
        <button
          className={`btn ${tab === "all" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("all")}
        >
          All Customers
        </button>
      </div>

      {loading ? (
        <div className="loading-screen"><span className="spinner spinner-dark" /></div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{tab === "pending" ? <CheckCircle2 size={32} /> : <Users size={32} />}</div>
          <h3>{tab === "pending" ? "No pending approvals" : "No customers yet"}</h3>
          <p>{tab === "pending" ? "All caught up!" : "Customers will appear here after registration."}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {list.map((c: any) => (
            <div key={c.id} style={{
              padding: "16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Link to={`/staff/customers/${c.id}`} style={{ flex: 1, textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                    {c.company_name || "—"} · {c.phone_number}
                  </div>
                  {(c.city || c.country) && (
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={12} /> {[c.city, c.country].filter(Boolean).join(", ")}
                    </div>
                  )}
                </Link>
                <span className={`badge ${STATUS_BADGE[c.status] || "badge-gray"}`} style={{ textTransform: "capitalize" }}>
                  {c.status}
                </span>
              </div>

              {/* Meta */}
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                Registered {new Date(c.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                {c.is_credit_account && <span style={{display:"inline-flex",alignItems:"center",gap:4,marginLeft:4}}><CreditCard size={12} /> Credit account</span>}
              </div>

              {/* Action buttons for pending */}
              {c.status === "pending" && (
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(c.id)}
                  >
                    {approveMutation.isPending ? "Approving…" : <><Check size={15} style={ic} /> Approve</>}
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, color: "var(--red, #ef4444)" }}
                    onClick={() => { setRejectId(c.id); setRejectReason(""); }}
                  >
                    <X size={15} style={ic} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectId !== null && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          zIndex: 1000, padding: 16,
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 480, padding: 20, margin: 0 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Reject Customer</h3>
            <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 12 }}>
              Optionally provide a reason — it will be sent via WhatsApp.
            </p>
            <textarea
              className="input"
              placeholder="Reason (optional)"
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{ resize: "none", marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setRejectId(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: "var(--red, #ef4444)" }}
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
              >
                {rejectMutation.isPending ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
