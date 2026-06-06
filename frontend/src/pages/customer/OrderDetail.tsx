import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import { StatusPill } from "@/components/StatusPill";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Check, AlertCircle, CreditCard, Paperclip, Upload, PackageCheck, Camera,
  PartyPopper, Factory, Package, Truck, Calendar, MapPin, RotateCcw, Droplet,
  FileWarning, ChevronLeft, Loader2, StickyNote,
} from "lucide-react";

const TIMELINE = [
  { key: "submitted",        label: "Placed" },
  { key: "proforma_sent",    label: "Invoice" },
  { key: "payment_verified", label: "Paid" },
  { key: "confirmed",        label: "Confirmed" },
  { key: "shipped",          label: "Shipped" },
  { key: "delivered",        label: "Delivered" },
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
  const grnFileRef = useRef<HTMLInputElement>(null);

  const [payMethod, setPayMethod] = useState("bank_transfer");
  const [payAmount, setPayAmount] = useState("");
  const [payFile,   setPayFile]   = useState<File | null>(null);
  const [payError,  setPayError]  = useState("");
  const [grnNotes,  setGrnNotes]  = useState("");
  const [grnError,  setGrnError]  = useState("");
  const [grnFile,   setGrnFile]   = useState<File | null>(null);
  const [showCancel,  setShowCancel]  = useState(false);
  const [cancelError, setCancelError] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data),
    refetchInterval: 20_000,
  });
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
    mutationFn: (fd: FormData) => api.post(`/orders/${id}/payment`, fd, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      setPayFile(null); setPayAmount(""); setPayError("");
    },
    onError: (err: any) => setPayError(err.response?.data?.detail || "Upload failed"),
  });
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
    mutationFn: (fd: FormData) => api.post(`/orders/${id}/grn`, fd, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data),
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
    fd.append("file", payFile); fd.append("amount", payAmount); fd.append("method", payMethod);
    uploadMutation.mutate(fd);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  if (!order) return <div className="text-center py-20"><AlertCircle className="size-9 text-ink-4 mx-auto mb-2" /><p className="text-ink-3">Order not found</p></div>;

  const curIdx = ORDER_INDEX[order.status] ?? 0;

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/orders" className="flex size-9 items-center justify-center rounded-full border border-border text-ink-3 hover:text-ink hover:border-primary transition-colors"><ChevronLeft className="size-5" /></Link>
        <div>
          <h1 className="text-xl font-bold font-mono">{order.order_number}</h1>
          <StatusPill status={order.status} />
        </div>
      </div>

      {/* Timeline */}
      <Card className="mb-4">
        <h3 className="text-[13px] font-bold text-ink-2 mb-4">Order Progress</h3>
        <div className="flex items-start">
          {TIMELINE.map((step, i) => {
            const done = curIdx >= (ORDER_INDEX[step.key] ?? 0);
            const current = order.status === step.key || (step.key === "shipped" && order.status === "ready_for_dispatch")
              || (step.key === "confirmed" && order.status === "in_production")
              || (step.key === "delivered" && ["grn_pending","grn_submitted","closed"].includes(order.status));
            return (
              <div key={step.key} className="flex items-start" style={{ flex: i < TIMELINE.length - 1 ? 1 : "0 0 auto" }}>
                <div className="flex flex-col items-center">
                  <div className={`size-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${done ? "bg-primary text-white" : "bg-canvas text-ink-4"} ${current ? "ring-2 ring-accent ring-offset-1" : ""}`}>
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </div>
                  <span className={`text-[10px] mt-1.5 text-center leading-tight ${done ? "text-ink-2 font-semibold" : "text-ink-4"}`}>{step.label}</span>
                </div>
                {i < TIMELINE.length - 1 && <div className={`flex-1 h-0.5 mt-3.5 mx-1 ${curIdx > (ORDER_INDEX[step.key] ?? 0) ? "bg-primary" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Payment upload */}
      {order.status === "proforma_sent" && (
        <Card className={`mb-4 border-2 ${paymentInfo?.status === "rejected" ? "border-red-300" : "border-amber-300"}`}>
          {paymentInfo?.status === "rejected" && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-3 mb-4">
              <div className="font-bold text-[13px] text-red-700 mb-1 flex items-center gap-1.5"><FileWarning className="size-4" /> Previous payment proof was rejected</div>
              {paymentInfo.rejection_reason && <div className="text-[13px] text-red-800">Reason: {paymentInfo.rejection_reason}</div>}
              <div className="text-[12px] text-red-700 mt-1">Please upload a new, clear image of your payment receipt.</div>
            </div>
          )}
          <h3 className="font-bold text-[15px] mb-1 flex items-center gap-2"><CreditCard className="size-4 text-primary" /> Upload Payment Proof</h3>
          <p className="text-[13px] text-ink-3 mb-4">Upload a screenshot or photo of your payment. Accepted: PNG, JPG, JPEG (max 10MB).</p>

          <Field label="Payment method">
            <select className={inputCls} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="credit">Credit Account</option>
            </select>
          </Field>
          <Field label="Amount paid (USD)">
            <input className={inputCls} type="number" min="0" step="0.01" placeholder={order.total_amount?.toFixed(2)} value={payAmount} onChange={e => { setPayAmount(e.target.value); setPayError(""); }} />
          </Field>
          <Field label="Payment proof image">
            <div onClick={() => fileRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${payFile ? "border-primary bg-teal-50" : "border-border bg-surface hover:border-primary/50"}`}>
              {payFile ? (
                <div className="text-[13px] font-semibold text-primary">
                  <span className="inline-flex items-center gap-1.5"><Paperclip className="size-4" /> {payFile.name}</span>
                  <div className="text-[11px] text-ink-3 mt-1 font-normal">{(payFile.size / 1024 / 1024).toFixed(2)} MB — tap to change</div>
                </div>
              ) : (
                <>
                  <Upload className="size-6 text-ink-4 mx-auto mb-2" />
                  <div className="text-[13px] font-semibold text-ink-2">Tap to select image</div>
                  <div className="text-[11px] text-ink-4 mt-1">PNG, JPG, JPEG · max 10MB</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={e => { if (e.target.files?.[0]) { setPayFile(e.target.files[0]); setPayError(""); } }} />
          </Field>
          {payError && <Alert tone="red">{payError}</Alert>}
          <PrimaryBtn onClick={handleUpload} loading={uploadMutation.isPending} disabled={!payFile || !payAmount}>Upload Payment Proof</PrimaryBtn>
        </Card>
      )}

      {/* GRN */}
      {order.status === "grn_pending" && (
        <Card className="mb-4 border-2 border-green-300">
          <h3 className="font-bold text-[15px] mb-1 flex items-center gap-2"><PackageCheck className="size-4 text-green-600" /> Confirm Goods Received</h3>
          <p className="text-[13px] text-ink-3 mb-4">Please confirm you have received the goods in good condition.</p>
          <Field label="Notes (optional)">
            <textarea className={inputCls + " h-auto py-2.5 resize-none"} rows={2} placeholder="Any comments about the delivery..." value={grnNotes} onChange={e => setGrnNotes(e.target.value)} />
          </Field>
          <Field label="Delivery photo (optional)">
            <div onClick={() => grnFileRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${grnFile ? "border-green-400 bg-green-50" : "border-border bg-surface hover:border-primary/50"}`}>
              {grnFile ? (
                <div className="text-[13px] font-semibold text-green-700"><span className="inline-flex items-center gap-1.5"><Paperclip className="size-4" /> {grnFile.name}</span><div className="text-[11px] text-ink-3 font-normal mt-0.5">Tap to change</div></div>
              ) : (
                <div className="text-[13px] text-ink-3 inline-flex items-center gap-1.5"><Camera className="size-4" /> Tap to attach a photo of the delivered goods</div>
              )}
            </div>
            <input ref={grnFileRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={e => { if (e.target.files?.[0]) setGrnFile(e.target.files[0]); }} />
          </Field>
          {grnError && <Alert tone="red">{grnError}</Alert>}
          <PrimaryBtn loading={grnMutation.isPending} onClick={() => {
            const fd = new FormData(); fd.append("condition_notes", grnNotes); fd.append("is_accepted", "true"); if (grnFile) fd.append("image", grnFile);
            grnMutation.mutate(fd);
          }}><Check className="size-4" /> Confirm Receipt</PrimaryBtn>
        </Card>
      )}

      {/* What happens next */}
      {["confirmed","in_production","ready_for_dispatch"].includes(order.status) && (
        <div className="rounded-2xl bg-teal-50 border border-teal-100 p-4 mb-4">
          <div className="font-bold text-primary mb-1 flex items-center gap-2">
            {order.status === "confirmed" ? <><PartyPopper className="size-4" /> Order confirmed!</> : order.status === "in_production" ? <><Factory className="size-4" /> In production</> : <><Package className="size-4" /> Ready for dispatch</>}
          </div>
          <div className="text-[13px] text-teal-800">
            {order.status === "confirmed" ? "Your order is confirmed and will go into production soon."
              : order.status === "in_production" ? "Your order is being prepared. We'll notify you when it ships."
              : "Your order is packed and ready — dispatching soon!"}
          </div>
          {order.tentative_delivery_date && <div className="text-[12px] text-teal-700/80 mt-1.5 inline-flex items-center gap-1.5"><Calendar className="size-3.5" /> Estimated delivery: {new Date(order.tentative_delivery_date).toLocaleDateString("en-US", { dateStyle: "long" })}</div>}
        </div>
      )}

      {/* Tracking */}
      {delivery?.delivery && ["shipped","delivered","grn_pending","grn_submitted","closed"].includes(order.status) && (
        <Card className="mb-4 border-2 border-purple-200">
          <h3 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            {order.status === "shipped" ? <><Truck className="size-4 text-purple-600" /> Your order is on the way!</> : <><Package className="size-4 text-purple-600" /> Delivery details</>}
          </h3>
          {delivery.delivery.carrier && <Row label="Carrier" value={delivery.delivery.carrier} />}
          {delivery.delivery.tracking_number && <Row label="Tracking #" value={<span className="font-mono font-bold text-primary tracking-wide">{delivery.delivery.tracking_number}</span>} />}
          {delivery.delivery.shipped_at && <Row label="Shipped" value={new Date(delivery.delivery.shipped_at).toLocaleDateString("en-US", { dateStyle: "medium" })} />}
          {delivery.delivery.delivered_at && <Row label="Delivered" last value={<span className="font-semibold text-green-600 inline-flex items-center gap-1"><Check className="size-3.5" /> {new Date(delivery.delivery.delivered_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>} />}
          {!delivery.delivery.carrier && !delivery.delivery.tracking_number && <div className="text-[13px] text-ink-3">Your order is on its way. Contact us for updates.</div>}
        </Card>
      )}

      {/* GRN submitted / closed */}
      {["grn_submitted","closed"].includes(order.status) && (
        <div className="rounded-2xl bg-green-50 border border-green-200 p-4 mb-4">
          <div className="font-bold text-green-800 mb-1 flex items-center gap-1.5"><Check className="size-4" /> {order.status === "closed" ? "Order complete" : "Goods receipt confirmed"}</div>
          <div className="text-[13px] text-green-700">{order.status === "closed" ? "This order has been closed. Thank you for your business!" : "Thank you for confirming receipt. Our team will close the order shortly."}</div>
          {delivery?.grn?.submitted_at && <div className="text-[12px] text-green-700/80 mt-1">GRN submitted {new Date(delivery.grn.submitted_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</div>}
        </div>
      )}

      {/* Items */}
      <Card className="mb-4 !p-0 overflow-hidden">
        <h3 className="font-bold text-[14px] px-4 pt-4 pb-1">Order Items</h3>
        {order.items?.map((item: any) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-t-0">
            <div className="size-9 rounded-lg bg-teal-50 flex items-center justify-center text-primary shrink-0"><Droplet className="size-4" /></div>
            <div className="flex-1 min-w-0"><div className="font-semibold text-sm">{item.sku_name || `SKU #${item.sku_id}`}</div><div className="text-[12px] text-ink-4">{item.quantity} × ${item.unit_price?.toFixed(2)}</div></div>
            <div className="font-bold text-sm">${item.subtotal?.toFixed(2)}</div>
          </div>
        ))}
        <div className="flex justify-between px-4 py-3 border-t-2 border-border font-bold"><span>Total</span><span className="text-primary">${order.total_amount?.toFixed(2)}</span></div>
      </Card>

      {/* Delivery address */}
      {order.delivery_address && (
        <Card className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-4 mb-1.5">Delivery Address</div>
          <div className="text-sm flex items-center gap-1.5"><MapPin className="size-4 text-ink-4 shrink-0" /> {order.delivery_address}</div>
          {order.tentative_delivery_date && <div className="text-[13px] text-ink-3 mt-1.5 inline-flex items-center gap-1.5"><Calendar className="size-3.5" /> Estimated: {new Date(order.tentative_delivery_date).toLocaleDateString("en-US", { dateStyle: "medium" })}</div>}
        </Card>
      )}

      {/* Notes */}
      {order.notes && (
        <Card className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-4 mb-1.5 flex items-center gap-1.5"><StickyNote className="size-3.5" /> Notes</div>
          <div className="text-sm">{order.notes}</div>
        </Card>
      )}

      {/* Cancel */}
      {order.status === "submitted" && (
        <button onClick={() => setShowCancel(true)} className="w-full h-12 rounded-full border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors mb-3">
          Cancel Order
        </button>
      )}

      {/* Reorder */}
      {order.status === "closed" && (
        <PrimaryBtn onClick={() => reorderMutation.mutate()} loading={reorderMutation.isPending}><RotateCcw className="size-4" /> Reorder — Place Again</PrimaryBtn>
      )}

      {showCancel && (
        <ConfirmDialog
          title="Cancel order?"
          message={<>Are you sure you want to cancel <strong>{order.order_number}</strong>? This cannot be undone.</>}
          confirmLabel="Yes, cancel"
          cancelLabel="Keep order"
          loading={cancelMutation.isPending}
          error={cancelError}
          onConfirm={() => cancelMutation.mutate()}
          onCancel={() => { setShowCancel(false); setCancelError(""); }}
        />
      )}
    </>
  );
}

const inputCls = "w-full h-11 rounded-xl border border-input bg-surface px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-4";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-4 ${className}`}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-3"><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">{label}</label>{children}</div>;
}
function Row({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return <div className={`flex justify-between py-1.5 text-[13px] ${last ? "" : "border-b border-border"}`}><span className="text-ink-3">{label}</span><span>{value}</span></div>;
}
function Alert({ children }: { tone?: "red"; children: React.ReactNode }) {
  return <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 mb-3 text-[13px] text-red-700">{children}</div>;
}
function PrimaryBtn({ children, onClick, loading, disabled }: { children: React.ReactNode; onClick: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-colors disabled:opacity-60">
      {loading ? <Loader2 className="size-5 animate-spin" /> : children}
    </button>
  );
}
