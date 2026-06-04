import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";
import { getStaffUser } from "../../hooks/useAuth";

const STATUS_LABEL: Record<string, string> = {
  submitted:         "Submitted",
  verified:          "Verified",
  proforma_sent:     "Invoice Sent",
  payment_uploaded:  "Payment Uploaded",
  payment_verified:  "Payment Verified",
  confirmed:         "Confirmed",
  in_production:     "In Production",
  ready_for_dispatch:"Ready to Ship",
  shipped:           "Shipped",
  delivered:         "Delivered",
  grn_pending:       "GRN Pending",
  grn_submitted:     "GRN Submitted",
  closed:            "Closed",
  cancelled:         "Cancelled",
};

const STATUS_BADGE: Record<string, string> = {
  submitted:         "badge-blue",
  verified:          "badge-blue",
  proforma_sent:     "badge-amber",
  payment_uploaded:  "badge-amber",
  payment_verified:  "badge-green",
  confirmed:         "badge-green",
  in_production:     "badge-purple",
  ready_for_dispatch:"badge-purple",
  shipped:           "badge-purple",
  delivered:         "badge-green",
  grn_pending:       "badge-amber",
  grn_submitted:     "badge-green",
  closed:            "badge-gray",
  cancelled:         "badge-gray",
};

export default function StaffOrderDetail() {
  const { id } = useParams();
  const qc     = useQueryClient();
  const user   = getStaffUser();

  const [proformaNote,  setProformaNote]  = useState("");
  const [deliveryDate,  setDeliveryDate]  = useState("");
  const [rejectReason,  setRejectReason]  = useState("");
  const [trackingNum,   setTrackingNum]   = useState("");
  const [carrier,       setCarrier]       = useState("");
  const [cancelReason,  setCancelReason]  = useState("");
  const [showCancel,    setShowCancel]    = useState(false);
  const [actionError,   setActionError]   = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["staff-order", id],
    queryFn: () => staffApi.get(`/staff/orders/${id}`).then(r => r.data),
    refetchInterval: 15_000,
  });

  const { data: delivery } = useQuery({
    queryKey: ["staff-delivery", id],
    queryFn: () => staffApi.get(`/staff/orders/${id}/delivery`).then(r => r.data).catch(() => null),
    enabled: !!order && ["shipped","delivered","grn_pending","grn_submitted","closed"].includes(order?.status),
  });

  const { data: payment } = useQuery({
    queryKey: ["staff-payment", id],
    queryFn: () => staffApi.get(`/staff/orders/${id}/payment`).then(r => r.data).catch(() => null),
    enabled: !!order && ["payment_uploaded","payment_verified","confirmed","in_production",
      "ready_for_dispatch","shipped","delivered","grn_pending","grn_submitted","closed"].includes(order?.status),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["staff-order", id] });
    qc.invalidateQueries({ queryKey: ["staff-orders"] });
    qc.invalidateQueries({ queryKey: ["staff-payment", id] });
  };

  const verifyMutation = useMutation({
    mutationFn: () => staffApi.post(`/staff/orders/${id}/verify`, { notes: proformaNote }).then(r => r.data),
    onSuccess: () => { invalidate(); setActionError(""); },
    onError: (e: any) => setActionError(e.response?.data?.detail || "Failed"),
  });

  const verifyPayMutation = useMutation({
    mutationFn: (approved: boolean) =>
      staffApi.post(`/finance/payments/${payment?.id}/verify`, {
        approved, rejection_reason: approved ? null : rejectReason,
      }).then(r => r.data),
    onSuccess: () => { invalidate(); setActionError(""); setRejectReason(""); },
    onError: (e: any) => setActionError(e.response?.data?.detail || "Failed"),
  });

  const confirmMutation = useMutation({
    mutationFn: () => staffApi.post(`/staff/orders/${id}/confirm`, {
      tentative_delivery_date: deliveryDate || null,
    }).then(r => r.data),
    onSuccess: () => { invalidate(); setActionError(""); },
    onError: (e: any) => setActionError(e.response?.data?.detail || "Failed"),
  });

  const dispatchMutation = useMutation({
    mutationFn: () => staffApi.post(`/staff/orders/${id}/dispatch`, {
      tracking_number: trackingNum || null,
      carrier: carrier || null,
    }).then(r => r.data),
    onSuccess: () => { invalidate(); setActionError(""); },
    onError: (e: any) => setActionError(e.response?.data?.detail || "Failed"),
  });

  const deliverMutation = useMutation({
    mutationFn: () => staffApi.post(`/staff/orders/${id}/deliver`, {}).then(r => r.data),
    onSuccess: () => { invalidate(); setActionError(""); },
    onError: (e: any) => setActionError(e.response?.data?.detail || "Failed"),
  });

  const closeMutation = useMutation({
    mutationFn: () => staffApi.post(`/staff/orders/${id}/close`, {}).then(r => r.data),
    onSuccess: () => { invalidate(); setActionError(""); },
    onError: (e: any) => setActionError(e.response?.data?.detail || "Failed"),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => staffApi.post(`/staff/orders/${id}/cancel`, { reason }).then(r => r.data),
    onSuccess: () => { invalidate(); setShowCancel(false); setCancelReason(""); setActionError(""); },
    onError: (e: any) => setActionError(e.response?.data?.detail || "Failed"),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => staffApi.patch(`/staff/orders/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => invalidate(),
    onError: (e: any) => setActionError(e.response?.data?.detail || "Failed"),
  });

  if (isLoading) return <div className="loading-screen"><span className="spinner spinner-dark" /></div>;
  if (!order) return <div className="empty-state"><div className="empty-icon">❌</div><p>Order not found</p></div>;

  const canVerify    = ["admin","central_team"].includes(user?.role || "");
  const canFinance   = ["admin","finance"].includes(user?.role || "");
  const canOps       = ["admin","central_team","operations"].includes(user?.role || "");
  const anyPending   = verifyMutation.isPending || verifyPayMutation.isPending ||
                       confirmMutation.isPending || dispatchMutation.isPending ||
                       deliverMutation.isPending || closeMutation.isPending ||
                       cancelMutation.isPending;
  const canCancel    = canVerify && !["shipped","delivered","grn_pending","grn_submitted","closed","cancelled"].includes(order?.status);

  return (
    <>
      <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/staff/orders" style={{ color: "var(--ink-3)", textDecoration: "none", fontSize: 20 }}>←</Link>
        <div>
          <h1>{order.order_number}</h1>
          <span className={`badge ${STATUS_BADGE[order.status] || "badge-gray"}`}>
            {STATUS_LABEL[order.status] || order.status}
          </span>
        </div>
      </div>

      {/* Customer info */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", marginBottom: 8 }}>CUSTOMER</div>
        <div style={{ fontWeight: 700 }}>{order.customer_name}</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{order.customer_phone}</div>
        {order.company_name && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{order.company_name}</div>}
      </div>

      {/* Action panels */}
      {actionError && <div className="alert alert-error">{actionError}</div>}

      {/* 1. Verify + send proforma */}
      {order.status === "submitted" && canVerify && (
        <div className="card" style={{ padding: 16, border: "2px solid var(--blue)" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>📋 Verify Order & Send Proforma</div>
          <div className="form-group">
            <label>Notes (appears on proforma)</label>
            <textarea
              className="input" rows={2} style={{ resize: "none" }}
              value={proformaNote} onChange={e => setProformaNote(e.target.value)}
              placeholder="Payment terms, validity period, etc."
            />
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={() => verifyMutation.mutate()}
            disabled={anyPending}
          >
            {verifyMutation.isPending ? <span className="spinner" /> : "✅ Verify & Send Proforma Invoice"}
          </button>
        </div>
      )}

      {/* 2. Verify payment */}
      {order.status === "payment_uploaded" && canFinance && payment && (
        <div className="card" style={{ padding: 16, border: "2px solid var(--amber, #f59e0b)" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>💳 Verify Payment</div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            <div><strong>Method:</strong> {payment.method?.replace("_", " ")}</div>
            <div><strong>Amount:</strong> ${payment.amount?.toFixed(2)}</div>
            <div><strong>Uploaded:</strong> {new Date(payment.uploaded_at).toLocaleString()}</div>
            {payment.proof_file_url && (
              <div style={{ marginTop: 10 }}>
                <img
                  src={payment.proof_file_url}
                  alt="Payment proof"
                  style={{
                    width: "100%", maxHeight: 260, objectFit: "contain",
                    borderRadius: "var(--radius)", border: "1px solid var(--border)",
                    background: "#f8f9fa", cursor: "pointer",
                  }}
                  onClick={() => window.open(payment.proof_file_url, "_blank")}
                />
                <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
                  Tap to open full size
                </div>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Rejection reason (if rejecting)</label>
            <input className="input" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Optional" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-primary" style={{ flex: 1 }}
              onClick={() => verifyPayMutation.mutate(true)}
              disabled={anyPending}
            >
              {verifyPayMutation.isPending ? <span className="spinner" /> : "✅ Approve"}
            </button>
            <button
              className="btn btn-secondary" style={{ flex: 1, color: "var(--red, #ef4444)" }}
              onClick={() => verifyPayMutation.mutate(false)}
              disabled={anyPending}
            >
              ✕ Reject
            </button>
          </div>
        </div>
      )}

      {/* 3. Confirm order */}
      {order.status === "payment_verified" && canVerify && (
        <div className="card" style={{ padding: 16, border: "2px solid var(--green, #16a34a)" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🎉 Confirm Order</div>
          <div className="form-group">
            <label>Tentative delivery date (optional)</label>
            <input type="date" className="input" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={() => confirmMutation.mutate()}
            disabled={anyPending}
          >
            {confirmMutation.isPending ? <span className="spinner" /> : "✅ Confirm & Notify Customer"}
          </button>
        </div>
      )}

      {/* 4. Dispatch */}
      {["confirmed","in_production","ready_for_dispatch"].includes(order.status) && canOps && (
        <div className="card" style={{ padding: 16, border: "2px solid var(--purple, #7c3aed)" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🚚 Mark as Dispatched</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="form-group">
              <label>Tracking number</label>
              <input className="input" value={trackingNum} onChange={e => setTrackingNum(e.target.value)} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label>Carrier</label>
              <input className="input" value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          {["confirmed","in_production"].includes(order.status) && (
            <button
              className="btn btn-secondary btn-full"
              style={{ marginBottom: 8 }}
              onClick={() => statusMutation.mutate(order.status === "confirmed" ? "in_production" : "ready_for_dispatch")}
              disabled={anyPending}
            >
              {order.status === "confirmed" ? "→ Move to In Production" : "→ Move to Ready for Dispatch"}
            </button>
          )}
          <button
            className="btn btn-primary btn-full"
            onClick={() => dispatchMutation.mutate()}
            disabled={anyPending}
          >
            {dispatchMutation.isPending ? <span className="spinner" /> : "🚚 Mark Shipped"}
          </button>
        </div>
      )}

      {/* 5. Mark delivered */}
      {order.status === "shipped" && canOps && (
        <div className="card" style={{ padding: 16, border: "2px solid var(--green, #16a34a)" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>📦 Mark as Delivered</div>
          <button
            className="btn btn-primary btn-full"
            onClick={() => deliverMutation.mutate()}
            disabled={anyPending}
          >
            {deliverMutation.isPending ? <span className="spinner" /> : "✅ Mark Delivered"}
          </button>
        </div>
      )}

      {/* 6. Close order */}
      {order.status === "grn_submitted" && canVerify && (
        <div className="card" style={{ padding: 16, border: "2px solid var(--border)" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🔒 Close Order</div>
          <button
            className="btn btn-primary btn-full"
            onClick={() => closeMutation.mutate()}
            disabled={anyPending}
          >
            {closeMutation.isPending ? <span className="spinner" /> : "Close & Archive Order"}
          </button>
        </div>
      )}

      {/* Delivery & GRN info */}
      {delivery?.delivery && (
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", marginBottom: 10 }}>DELIVERY</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {delivery.delivery.carrier && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--ink-3)" }}>Carrier</span>
                <span style={{ fontWeight: 600 }}>{delivery.delivery.carrier}</span>
              </div>
            )}
            {delivery.delivery.tracking_number && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--ink-3)" }}>Tracking #</span>
                <span style={{ fontWeight: 700, color: "var(--blue)" }}>{delivery.delivery.tracking_number}</span>
              </div>
            )}
            {delivery.delivery.shipped_at && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--ink-3)" }}>Shipped</span>
                <span>{new Date(delivery.delivery.shipped_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
              </div>
            )}
            {delivery.delivery.delivered_at && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--ink-3)" }}>Delivered</span>
                <span style={{ fontWeight: 600, color: "var(--green,#16a34a)" }}>
                  ✓ {new Date(delivery.delivery.delivered_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </span>
              </div>
            )}
          </div>
          {delivery.grn && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", marginBottom: 8 }}>GRN</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "var(--ink-3)" }}>Accepted</span>
                <span style={{ fontWeight: 600, color: delivery.grn.is_accepted ? "var(--green,#16a34a)" : "var(--red,#ef4444)" }}>
                  {delivery.grn.is_accepted ? "✓ Yes" : "✗ No"}
                </span>
              </div>
              {delivery.grn.condition_notes && (
                <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>
                  "{delivery.grn.condition_notes}"
                </div>
              )}
              {delivery.grn.image_url && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={delivery.grn.image_url}
                    alt="GRN photo"
                    style={{
                      width: "100%", maxHeight: 220, objectFit: "contain",
                      borderRadius: "var(--radius)", border: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                    onClick={() => window.open(delivery.grn.image_url, "_blank")}
                  />
                  <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>Tap to view full size</div>
                </div>
              )}
              {delivery.grn.submitted_at && (
                <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 4 }}>
                  Submitted {new Date(delivery.grn.submitted_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Order items */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "14px 16px 0", fontWeight: 700, fontSize: 14 }}>Order Items</div>
        {order.items?.map((item: any) => (
          <div key={item.id} className="list-item" style={{ display: "flex" }}>
            <div className="list-item-icon">🧪</div>
            <div className="list-item-body">
              <div className="list-item-title">{item.sku_name || `SKU #${item.sku_id}`}</div>
              <div className="list-item-sub">{item.quantity} × ${item.unit_price?.toFixed(2)}</div>
            </div>
            <div className="list-item-right">
              <div className="list-item-amount">${item.subtotal?.toFixed(2)}</div>
            </div>
          </div>
        ))}
        <div style={{
          padding: "12px 16px", borderTop: "2px solid var(--border)",
          display: "flex", justifyContent: "space-between", fontWeight: 700,
        }}>
          <span>Total</span>
          <span style={{ color: "var(--blue)" }}>${order.total_amount?.toFixed(2)}</span>
        </div>
      </div>

      {/* Delivery details */}
      {order.delivery_address && (
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", marginBottom: 4 }}>DELIVERY</div>
          <div style={{ fontSize: 14 }}>📍 {order.delivery_address}</div>
          {order.tentative_delivery_date && (
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>
              📅 Est. {new Date(order.tentative_delivery_date).toLocaleDateString("en-US", { dateStyle: "medium" })}
            </div>
          )}
        </div>
      )}

      {order.notes && (
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", marginBottom: 4 }}>NOTES</div>
          <div style={{ fontSize: 14 }}>{order.notes}</div>
        </div>
      )}

      {/* Cancel button */}
      {canCancel && (
        <div style={{ padding: "4px 0 24px" }}>
          <button
            className="btn btn-secondary btn-full"
            style={{ color: "var(--red,#ef4444)", borderColor: "var(--red,#ef4444)" }}
            onClick={() => setShowCancel(true)}
          >
            Cancel Order
          </button>
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
          display: "flex", alignItems: "flex-end", zIndex: 300, padding: 16,
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 480, padding: 20, margin: "0 auto" }}>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Cancel Order</h3>
            <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 12 }}>
              This cannot be undone. Optionally provide a reason.
            </p>
            <textarea
              className="input"
              rows={3}
              style={{ resize: "none", marginBottom: 12 }}
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
            {actionError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{actionError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCancel(false)}>
                Keep Order
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: "var(--red,#ef4444)" }}
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(cancelReason)}
              >
                {cancelMutation.isPending ? <span className="spinner" /> : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
