import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";
import { Check, X, CheckCircle2 } from "lucide-react";

const ic = { display: "inline", verticalAlign: "-3px", marginRight: 5 } as const;

export default function Payments() {
  const qc = useQueryClient();
  const [rejectId,     setRejectId]     = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["pending-payments"],
    queryFn: () => staffApi.get("/finance/payments").then(r => r.data),
    refetchInterval: 20_000,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, approved, reason }: { id: number; approved: boolean; reason?: string }) =>
      staffApi.post(`/finance/payments/${id}/verify`, {
        approved,
        rejection_reason: reason || null,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-payments"] });
      setRejectId(null);
      setRejectReason("");
    },
  });

  return (
    <>
      <div className="page-header">
        <h1>Payments</h1>
        <p>{payments.length} awaiting verification</p>
      </div>

      {isLoading ? (
        <div className="loading-screen"><span className="spinner spinner-dark" /></div>
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><CheckCircle2 size={32} /></div>
          <h3>No pending payments</h3>
          <p>All payment proofs have been verified.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {payments.map((p: any) => (
            <div key={p.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.order_number}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{p.customer_name} · {p.customer_phone}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: "var(--blue)", fontSize: 16 }}>${p.amount?.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "capitalize" }}>
                    {p.method?.replace("_", " ")}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 12 }}>
                Uploaded {new Date(p.uploaded_at).toLocaleString()}
              </div>

              {p.proof_file_url && (
                <div style={{ marginBottom: 12 }}>
                  <img
                    src={p.proof_file_url}
                    alt="Payment proof"
                    style={{
                      width: "100%", maxHeight: 280, objectFit: "contain",
                      borderRadius: "var(--radius)", border: "1px solid var(--border)",
                      background: "#f8f9fa", cursor: "pointer",
                    }}
                    onClick={() => window.open(p.proof_file_url, "_blank")}
                  />
                  <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4, textAlign: "center" }}>
                    Tap image to open full size
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={verifyMutation.isPending}
                  onClick={() => verifyMutation.mutate({ id: p.id, approved: true })}
                >
                  <Check size={15} style={ic} /> Approve
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, color: "var(--red, #ef4444)" }}
                  onClick={() => { setRejectId(p.id); setRejectReason(""); }}
                >
                  <X size={15} style={ic} /> Reject
                </button>
              </div>
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
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Reject Payment</h3>
            <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 12 }}>
              Provide a reason so the customer knows what to fix.
            </p>
            <textarea
              className="input"
              placeholder="e.g. Amount doesn't match invoice, screenshot unclear..."
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{ resize: "none", marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRejectId(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: "var(--red, #ef4444)" }}
                disabled={verifyMutation.isPending}
                onClick={() => verifyMutation.mutate({ id: rejectId, approved: false, reason: rejectReason })}
              >
                {verifyMutation.isPending ? <span className="spinner" /> : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
