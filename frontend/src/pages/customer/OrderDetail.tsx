import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import {
  Check, AlertCircle, CreditCard, Paperclip, Upload, PackageCheck, Camera,
  PartyPopper, Factory, Package, Truck, Calendar, MapPin, RotateCcw, Droplet, FileWarning,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  submitted:         "Submitted — awaiting review",
  verified:          "Verified",
  proforma_sent:     "Invoice sent — please upload payment proof",
  payment_uploaded:  "Payment proof received — awaiting verification",
  payment_verified:  "Payment verified",
  confirmed:         "Order confirmed",
  in_production:     "In production",
  ready_for_dispatch:"Ready for dispatch",
  shipped:           "Shipped — on the way!",
  delivered:         "Delivered",
  grn_pending:       "Please confirm goods received",
  grn_submitted:     "GRN submitted",
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

const TIMELINE = [
  { key: "submitted",         label: "Order placed" },
  { key: "proforma_sent",     label: "Invoice sent" },
  { key: "payment_uploaded",  label: "Payment uploaded" },
  { key: "payment_verified",  label: "Payment verified" },
  { key: "confirmed",         label: "Confirmed" },
  { key: "in_production",     label: "In production" },
  { key: "shipped",           label: "Shipped" },
  { key: "delivered",         label: "Delivered" },
  { key: "closed",            label: "Closed" },
];

const ORDER_INDEX: Record<string, number> = Object.fromEntries(
  ["submitted","verified","proforma_sent","payment_uploaded","payment_verified",
   "confirmed","in_production","ready_for_dispatch","shipped","delivered",
   "grn_pending","grn_submitted","closed"].map((s, i) => [s, i])
);

export default function OrderDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const fileRef    = useRef<HTMLInputElement>(null);

  const [payMethod,  setPayMethod]  = useState("bank_transfer");
  const [payAmount,  setPayAmount]  = useState("");
  const [payFile,    setPayFile]    = useState<File | null>(null);
  const [payError,   setPayError]   = useState("");
  const [grnNotes,   setGrnNotes]   = useState("");
  const [grnError,   setGrnError]   = useState("");
  const [grnFile,    setGrnFile]    = useState<File | null>(null);
  const grnFileRef = useRef<HTMLInputElement>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data),
    refetchInterval: 20_000,
  });

  // Fetch payment to show rejection reason if it was rejected
  const { data: paymentInfo } = useQuery({
    queryKey: ["my-payment", id],
    queryFn: () => api.get(`/orders/${id}/payment`).then(r => r.data).catch(() => null),
    enabled: !!order && order.status === "proforma_sent",
  });

  const { data: delivery } = useQuery({
    queryKey: ["order-delivery", id],
    queryFn: () => api.get(`/orders/${id}/delivery`).then(r => r.data).catch(() => null),
    enabled: !!order && ["shipped","delivered","grn_pending","grn_submitted","closed"].includes(order?.status),
    refetchInterval: 30_000,
  });

  const uploadMutation = useMutation({
    mutationFn: (fd: FormData) => api.post(`/orders/${id}/payment`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      setPayFile(null); setPayAmount(""); setPayError("");
    },
    onError: (err: any) => setPayError(err.response?.data?.detail || "Upload failed"),
  });

  const [showCancel,   setShowCancel]   = useState(false);
  const [cancelError,  setCancelError]  = useState("");

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/orders/${id}/cancel`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      setShowCancel(false);
    },
    onError: (err: any) => setCancelError(err.response?.data?.detail || "Could not cancel order"),
  });

  const reorderMutation = useMutation({
    mutationFn: () => api.post(`/orders/${id}/reorder`).then(r => r.data),
    onSuccess: (newOrder) => navigate(`/orders/${newOrder.id}`),
  });

  const grnMutation = useMutation({
    mutationFn: (fd: FormData) => api.post(`/orders/${id}/grn`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["order-delivery", id] });
      setGrnNotes(""); setGrnError(""); setGrnFile(null);
    },
    onError: (err: any) => setGrnError(err.response?.data?.detail || "Failed to submit GRN"),
  });

  const handleUpload = () => {
    if (!payFile || !payAmount) { setPayError("Please select a file and enter amount."); return; }
    const fd = new FormData();
    fd.append("file", payFile);
    fd.append("amount", payAmount);
    fd.append("method", payMethod);
    uploadMutation.mutate(fd);
  };

  if (isLoading) return <div className="loading-screen"><span className="spinner spinner-dark" /></div>;
  if (!order) return <div className="empty-state"><div className="empty-icon"><AlertCircle size={36} /></div><p>Order not found</p></div>;

  return (
    <>
      <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/orders" style={{ color: "var(--ink-3)", textDecoration: "none", fontSize: 20 }}>←</Link>
        <div>
          <h1>{order.order_number}</h1>
          <span className={`badge ${STATUS_BADGE[order.status] || "badge-gray"}`}>
            {STATUS_LABEL[order.status] || order.status}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="card" style={{ padding: "16px 16px 8px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--ink-2)" }}>Order Progress</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", paddingBottom: 8 }}>
          {TIMELINE.map((step, i) => {
            const done    = ORDER_INDEX[order.status] >= ORDER_INDEX[step.key];
            const current = order.status === step.key ||
              (step.key === "shipped" && ["shipped","ready_for_dispatch"].includes(order.status));
            return (
              <div key={step.key} style={{ display: "flex", alignItems: "center", flex: i < TIMELINE.length - 1 ? 1 : undefined }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 56 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: done ? "var(--blue)" : "var(--border)",
                    color: done ? "#fff" : "var(--ink-4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700,
                    border: current ? "3px solid var(--blue-dark, #1d4ed8)" : "none",
                    boxSizing: "border-box",
                  }}>
                    {done ? <Check size={14} /> : i + 1}
                  </div>
                  <div style={{
                    fontSize: 9, marginTop: 4, textAlign: "center",
                    color: done ? "var(--ink-2)" : "var(--ink-4)",
                    fontWeight: done ? 600 : 400, maxWidth: 52,
                  }}>{step.label}</div>
                </div>
                {i < TIMELINE.length - 1 && (
                  <div style={{
                    flex: 1, height: 2,
                    background: ORDER_INDEX[order.status] > ORDER_INDEX[step.key] ? "var(--blue)" : "var(--border)",
                    marginBottom: 22, minWidth: 8,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment upload — shown when proforma sent */}
      {order.status === "proforma_sent" && (
        <div className="card" style={{ padding: 16, border: `2px solid ${paymentInfo?.status === "rejected" ? "var(--red,#ef4444)" : "var(--amber,#f59e0b)"}` }}>
          {paymentInfo?.status === "rejected" && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: "var(--radius)", padding: "10px 12px", marginBottom: 14,
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--red,#ef4444)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <FileWarning size={15} /> Previous payment proof was rejected
              </div>
              {paymentInfo.rejection_reason && (
                <div style={{ fontSize: 13, color: "#991b1b" }}>
                  Reason: {paymentInfo.rejection_reason}
                </div>
              )}
              <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 4 }}>
                Please upload a new, clear image of your payment receipt.
              </div>
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}><CreditCard size={17} /> Upload Payment Proof</div>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 12 }}>
            Upload a screenshot or photo of your payment. Accepted: PNG, JPG, JPEG (max 10MB).
          </p>

          <div className="form-group">
            <label>Payment method</label>
            <select className="input" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="credit">Credit Account</option>
            </select>
          </div>

          <div className="form-group">
            <label>Amount paid (USD)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder={order.total_amount?.toFixed(2)}
              value={payAmount}
              onChange={e => { setPayAmount(e.target.value); setPayError(""); }}
            />
          </div>

          <div className="form-group">
            <label>Payment proof image</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${payFile ? "var(--blue)" : "var(--border)"}`,
                borderRadius: "var(--radius)", padding: "24px 16px",
                textAlign: "center", cursor: "pointer",
                background: payFile ? "var(--blue-light, #eff6ff)" : "var(--surface)",
              }}
            >
              {payFile ? (
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--blue)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Paperclip size={15} /> {payFile.name}</span>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
                    {(payFile.size / 1024 / 1024).toFixed(2)} MB — tap to change
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: "var(--ink-4)" }}><Upload size={26} /></div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>Tap to select image</div>
                  <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>PNG, JPG, JPEG · max 10MB</div>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) { setPayFile(e.target.files[0]); setPayError(""); } }}
            />
          </div>

          {payError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{payError}</div>}

          <button
            className="btn btn-primary btn-full"
            onClick={handleUpload}
            disabled={uploadMutation.isPending || !payFile || !payAmount}
          >
            {uploadMutation.isPending ? <span className="spinner" /> : "Upload Payment Proof →"}
          </button>
        </div>
      )}

      {/* GRN — shown when delivered */}
      {order.status === "grn_pending" && (
        <div className="card" style={{ padding: 16, border: "2px solid var(--green, #16a34a)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}><PackageCheck size={17} /> Confirm Goods Received</div>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 12 }}>
            Please confirm you have received the goods in good condition.
          </p>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              className="input"
              rows={2}
              style={{ resize: "none" }}
              placeholder="Any comments about the delivery..."
              value={grnNotes}
              onChange={e => setGrnNotes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Delivery photo (optional)</label>
            <div
              onClick={() => grnFileRef.current?.click()}
              style={{
                border: `2px dashed ${grnFile ? "var(--green,#16a34a)" : "var(--border)"}`,
                borderRadius: "var(--radius)", padding: 16, textAlign: "center",
                cursor: "pointer", background: grnFile ? "#f0fdf4" : "var(--surface)",
              }}
            >
              {grnFile ? (
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green,#16a34a)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Paperclip size={15} /> {grnFile.name}</span>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 400, marginTop: 2 }}>Tap to change</div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 6 }}><Camera size={16} /> Tap to attach a photo of the delivered goods</div>
              )}
            </div>
            <input
              ref={grnFileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) setGrnFile(e.target.files[0]); }}
            />
          </div>

          {grnError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{grnError}</div>}
          <button
            className="btn btn-primary btn-full"
            onClick={() => {
              const fd = new FormData();
              fd.append("condition_notes", grnNotes);
              fd.append("is_accepted", "true");
              if (grnFile) fd.append("image", grnFile);
              grnMutation.mutate(fd);
            }}
            disabled={grnMutation.isPending}
          >
            {grnMutation.isPending ? <span className="spinner" /> : <><Check size={16} /> Confirm Receipt</>}
          </button>
        </div>
      )}

      {/* What happens next banner */}
      {["confirmed","in_production","ready_for_dispatch"].includes(order.status) && (
        <div className="alert" style={{ background: "var(--blue-light,#f0fdfa)", border: "1px solid #99f6e4", color: "var(--blue)" }}>
          <div style={{ fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 7 }}>
            {order.status === "confirmed" ? <><PartyPopper size={16} /> Order confirmed!</> : order.status === "in_production" ? <><Factory size={16} /> In production</> : <><Package size={16} /> Ready for dispatch</>}
          </div>
          <div style={{ fontSize: 13 }}>
            {order.status === "confirmed"
              ? "Your order is confirmed and will go into production soon."
              : order.status === "in_production"
              ? "Your order is being prepared. We'll notify you when it ships."
              : "Your order is packed and ready — dispatching soon!"}
          </div>
          {order.tentative_delivery_date && (
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.8, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Calendar size={13} /> Estimated delivery: {new Date(order.tentative_delivery_date).toLocaleDateString("en-US", { dateStyle: "long" })}
            </div>
          )}
        </div>
      )}

      {/* Tracking info — shown when shipped */}
      {delivery?.delivery && ["shipped","delivered","grn_pending","grn_submitted","closed"].includes(order.status) && (
        <div className="card" style={{ padding: 16, border: "2px solid var(--purple,#7c3aed)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>
            {order.status === "shipped" ? <><Truck size={17} /> Your order is on the way!</> : <><Package size={17} /> Delivery details</>}
          </div>
          {delivery.delivery.carrier && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Carrier</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{delivery.delivery.carrier}</span>
            </div>
          )}
          {delivery.delivery.tracking_number && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Tracking #</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)", letterSpacing: 1 }}>
                {delivery.delivery.tracking_number}
              </span>
            </div>
          )}
          {delivery.delivery.shipped_at && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Shipped</span>
              <span style={{ fontSize: 13 }}>{new Date(delivery.delivery.shipped_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
            </div>
          )}
          {delivery.delivery.delivered_at && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Delivered</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--green,#16a34a)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Check size={14} /> {new Date(delivery.delivery.delivered_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
              </span>
            </div>
          )}
          {!delivery.delivery.carrier && !delivery.delivery.tracking_number && (
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Your order is on its way. Contact us for updates.</div>
          )}
        </div>
      )}

      {/* GRN submitted confirmation */}
      {["grn_submitted","closed"].includes(order.status) && (
        <div className="alert" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
          <div style={{ fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={16} /> {order.status === "closed" ? "Order complete" : "Goods receipt confirmed"}
          </div>
          <div style={{ fontSize: 13 }}>
            {order.status === "closed"
              ? "This order has been closed. Thank you for your business!"
              : "Thank you for confirming receipt. Our team will close the order shortly."}
          </div>
          {delivery?.grn?.submitted_at && (
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>
              GRN submitted {new Date(delivery.grn.submitted_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
            </div>
          )}
        </div>
      )}

      {/* Order items */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "14px 16px 0", fontWeight: 700, fontSize: 14 }}>Order Items</div>
        {order.items?.map((item: any) => (
          <div key={item.id} className="list-item" style={{ display: "flex" }}>
            <div className="list-item-icon"><Droplet size={18} /></div>
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

      {/* Delivery info */}
      {order.delivery_address && (
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", marginBottom: 4 }}>DELIVERY ADDRESS</div>
          <div style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><MapPin size={15} className="shrink-0" /> {order.delivery_address}</div>
          {order.tentative_delivery_date && (
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Calendar size={13} /> Estimated: {new Date(order.tentative_delivery_date).toLocaleDateString("en-US", { dateStyle: "medium" })}
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

      {/* Cancel button — only for submitted orders */}
      {order.status === "submitted" && (
        <div style={{ padding: "4px 0 8px" }}>
          <button
            className="btn btn-secondary btn-full"
            style={{ color: "var(--red,#ef4444)", borderColor: "var(--red,#ef4444)" }}
            onClick={() => setShowCancel(true)}
          >
            Cancel Order
          </button>
        </div>
      )}

      {/* Reorder button — show for closed orders */}
      {order.status === "closed" && (
        <div style={{ padding: "4px 0 24px" }}>
          <button
            className="btn btn-primary btn-full"
            onClick={() => reorderMutation.mutate()}
            disabled={reorderMutation.isPending}
          >
            {reorderMutation.isPending ? <span className="spinner" /> : <><RotateCcw size={16} /> Reorder — Place Again</>}
          </button>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancel && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
          display: "flex", alignItems: "flex-end", zIndex: 300, padding: 16,
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 480, padding: 20, margin: "0 auto" }}>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Cancel Order?</h3>
            <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 16 }}>
              Are you sure you want to cancel <strong>{order.order_number}</strong>? This cannot be undone.
            </p>
            {cancelError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{cancelError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCancel(false)}>
                Keep Order
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: "var(--red,#ef4444)" }}
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                {cancelMutation.isPending ? <span className="spinner" /> : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
