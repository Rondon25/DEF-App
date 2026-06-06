import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";
import { getStaffUser } from "../../hooks/useAuth";
import { SkeletonOrderDetail } from "../../components/Skeleton";
import ErrorScreen from "../../components/ErrorScreen";
import { StatusPill } from "@/components/StatusPill";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  ChevronLeft, ClipboardCheck, CreditCard, Check, X, PartyPopper, Truck,
  PackageCheck, Lock, StickyNote, Droplet, MapPin, Loader2, Calendar, Trash2,
} from "lucide-react";

const inputCls = "w-full h-11 rounded-xl border border-input bg-surface px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-4";
const taCls = "w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-ink-4";

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
  const [newNote,       setNewNote]       = useState("");
  const noteRef = useRef<HTMLTextAreaElement>(null);

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

  const { data: notes = [] } = useQuery({
    queryKey: ["order-notes", id],
    queryFn: () => staffApi.get(`/staff/orders/${id}/notes`).then(r => r.data),
    enabled: !!order,
  });

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => staffApi.post(`/staff/orders/${id}/notes`, { content }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order-notes", id] });
      setNewNote("");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) => staffApi.delete(`/staff/orders/${id}/notes/${noteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order-notes", id] }),
  });

  if (isLoading) return <SkeletonOrderDetail />;
  if (!order) return <ErrorScreen title="Order not found" message="This order may have been deleted or you don't have access." back />;

  const canVerify    = ["admin","central_team"].includes(user?.role || "");
  const canFinance   = ["admin","finance","central_team"].includes(user?.role || "");
  const canOps       = ["admin","central_team","operations"].includes(user?.role || "");
  const anyPending   = verifyMutation.isPending || verifyPayMutation.isPending ||
                       confirmMutation.isPending || dispatchMutation.isPending ||
                       deliverMutation.isPending || closeMutation.isPending ||
                       cancelMutation.isPending;
  const canCancel    = canVerify && !["shipped","delivered","grn_pending","grn_submitted","closed","cancelled"].includes(order?.status);

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <Link to="/staff/orders" className="flex size-9 items-center justify-center rounded-full border border-border text-ink-3 hover:text-ink hover:border-primary transition-colors">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-mono">{order.order_number}</h1>
          <div className="mt-0.5"><StatusPill status={order.status} /></div>
        </div>
      </div>

      {/* Customer info */}
      <Card label="Customer">
        <div className="font-bold">{order.customer_name}</div>
        <div className="text-[13px] text-ink-3">{order.customer_phone}</div>
        {order.company_name && <div className="text-[13px] text-ink-3">{order.company_name}</div>}
      </Card>

      {actionError && <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 mb-4 text-[13px] text-red-700">{actionError}</div>}

      {/* 1. Verify + send proforma */}
      {order.status === "submitted" && canVerify && (
        <ActionCard icon={<ClipboardCheck className="size-4" />} tone="teal" title="Verify Order & Send Proforma">
          <Field label="Notes (appears on proforma)">
            <textarea className={taCls} rows={2} value={proformaNote} onChange={e => setProformaNote(e.target.value)} placeholder="Payment terms, validity period, etc." />
          </Field>
          <PrimaryBtn loading={verifyMutation.isPending} disabled={anyPending} onClick={() => verifyMutation.mutate()}><Check className="size-4" /> Verify & Send Proforma Invoice</PrimaryBtn>
        </ActionCard>
      )}

      {/* 2. Verify payment */}
      {order.status === "payment_uploaded" && canFinance && payment && (
        <ActionCard icon={<CreditCard className="size-4" />} tone="amber" title="Verify Payment">
          <div className="text-[13px] space-y-0.5 mb-3">
            <div><span className="text-ink-3">Method:</span> <span className="font-semibold capitalize">{payment.method?.replace("_", " ")}</span></div>
            <div><span className="text-ink-3">Amount:</span> <span className="font-semibold">₹{payment.amount?.toFixed(2)}</span></div>
            <div><span className="text-ink-3">Uploaded:</span> {new Date(payment.uploaded_at).toLocaleString()}</div>
          </div>
          {payment.proof_file_url && (
            <div className="mb-3">
              <img src={payment.proof_file_url} alt="Payment proof" onClick={() => window.open(payment.proof_file_url, "_blank")}
                className="w-full max-h-64 object-contain rounded-xl border border-border bg-canvas cursor-pointer" />
              <div className="text-[11px] text-ink-4 mt-1">Tap to open full size</div>
            </div>
          )}
          <Field label="Rejection reason (if rejecting)">
            <input className={inputCls} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Optional" />
          </Field>
          <div className="flex gap-2">
            <button onClick={() => verifyPayMutation.mutate(true)} disabled={anyPending}
              className="flex-1 h-11 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-colors disabled:opacity-60">
              {verifyPayMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Approve</>}
            </button>
            <button onClick={() => verifyPayMutation.mutate(false)} disabled={anyPending}
              className="flex-1 h-11 rounded-full border border-red-200 text-red-600 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-red-50 transition-colors disabled:opacity-60">
              <X className="size-4" /> Reject
            </button>
          </div>
        </ActionCard>
      )}

      {/* 3. Confirm order */}
      {order.status === "payment_verified" && canVerify && (
        <ActionCard icon={<PartyPopper className="size-4" />} tone="green" title="Confirm Order">
          <Field label="Tentative delivery date (optional)">
            <input type="date" className={inputCls} value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
          </Field>
          <PrimaryBtn loading={confirmMutation.isPending} disabled={anyPending} onClick={() => confirmMutation.mutate()}><Check className="size-4" /> Confirm & Notify Customer</PrimaryBtn>
        </ActionCard>
      )}

      {/* 4. Dispatch */}
      {["confirmed","in_production","ready_for_dispatch"].includes(order.status) && canOps && (
        <ActionCard icon={<Truck className="size-4" />} tone="purple" title="Mark as Dispatched">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Tracking number"><input className={inputCls} value={trackingNum} onChange={e => setTrackingNum(e.target.value)} placeholder="Optional" /></Field>
            <Field label="Carrier"><input className={inputCls} value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Optional" /></Field>
          </div>
          {["confirmed","in_production"].includes(order.status) && (
            <button onClick={() => statusMutation.mutate(order.status === "confirmed" ? "in_production" : "ready_for_dispatch")} disabled={anyPending}
              className="w-full h-11 rounded-full border border-border text-sm font-semibold text-ink-2 hover:bg-canvas transition-colors mb-2 disabled:opacity-60">
              {order.status === "confirmed" ? "Move to In Production" : "Move to Ready for Dispatch"}
            </button>
          )}
          <PrimaryBtn loading={dispatchMutation.isPending} disabled={anyPending} onClick={() => dispatchMutation.mutate()}><Truck className="size-4" /> Mark Shipped</PrimaryBtn>
        </ActionCard>
      )}

      {/* 5. Mark delivered */}
      {order.status === "shipped" && canOps && (
        <ActionCard icon={<PackageCheck className="size-4" />} tone="green" title="Mark as Delivered">
          <PrimaryBtn loading={deliverMutation.isPending} disabled={anyPending} onClick={() => deliverMutation.mutate()}><Check className="size-4" /> Mark Delivered</PrimaryBtn>
        </ActionCard>
      )}

      {/* 6. Close order */}
      {order.status === "grn_submitted" && canVerify && (
        <ActionCard icon={<Lock className="size-4" />} tone="neutral" title="Close Order">
          <PrimaryBtn loading={closeMutation.isPending} disabled={anyPending} onClick={() => closeMutation.mutate()}>Close &amp; Archive Order</PrimaryBtn>
        </ActionCard>
      )}

      {/* Delivery & GRN info */}
      {delivery?.delivery && (
        <Card label="Delivery">
          <div className="space-y-1.5">
            {delivery.delivery.carrier && <Row label="Carrier" value={delivery.delivery.carrier} />}
            {delivery.delivery.tracking_number && <Row label="Tracking #" value={<span className="font-mono font-bold text-primary">{delivery.delivery.tracking_number}</span>} />}
            {delivery.delivery.shipped_at && <Row label="Shipped" value={new Date(delivery.delivery.shipped_at).toLocaleDateString("en-US", { dateStyle: "medium" })} />}
            {delivery.delivery.delivered_at && <Row label="Delivered" value={<span className="font-semibold text-green-600 inline-flex items-center gap-1"><Check className="size-3.5" /> {new Date(delivery.delivery.delivered_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>} />}
          </div>
          {delivery.grn && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink-4 mb-2">GRN</div>
              <Row label="Accepted" value={<span className={`font-semibold ${delivery.grn.is_accepted ? "text-green-600" : "text-red-600"}`}>{delivery.grn.is_accepted ? "Yes" : "No"}</span>} />
              {delivery.grn.condition_notes && <div className="text-[13px] text-ink-3 mt-1">"{delivery.grn.condition_notes}"</div>}
              {delivery.grn.image_url && (
                <img src={delivery.grn.image_url} alt="GRN photo" onClick={() => window.open(delivery.grn.image_url, "_blank")}
                  className="w-full max-h-56 object-contain rounded-xl border border-border mt-2 cursor-pointer" />
              )}
              {delivery.grn.submitted_at && <div className="text-[12px] text-ink-4 mt-1">Submitted {new Date(delivery.grn.submitted_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</div>}
            </div>
          )}
        </Card>
      )}

      {/* Order items */}
      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden mb-4">
        <h3 className="font-bold text-[14px] px-4 pt-4 pb-1">Order Items</h3>
        {order.items?.map((item: any) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-t-0">
            <div className="size-9 rounded-lg bg-teal-50 flex items-center justify-center text-primary shrink-0"><Droplet className="size-4" /></div>
            <div className="flex-1 min-w-0"><div className="font-semibold text-sm">{item.sku_name || `SKU #${item.sku_id}`}</div><div className="text-[12px] text-ink-4">{item.quantity} × ₹{item.unit_price?.toFixed(2)}</div></div>
            <div className="font-bold text-sm">₹{item.subtotal?.toFixed(2)}</div>
          </div>
        ))}
        <div className="flex justify-between px-4 py-3 border-t-2 border-border font-bold"><span>Total</span><span className="text-primary">₹{order.total_amount?.toFixed(2)}</span></div>
      </div>

      {/* Delivery address */}
      {order.delivery_address && (
        <Card label="Delivery Address">
          <div className="text-sm flex items-center gap-1.5"><MapPin className="size-4 text-ink-4 shrink-0" /> {order.delivery_address}</div>
          {order.tentative_delivery_date && <div className="text-[13px] text-ink-3 mt-1.5 inline-flex items-center gap-1.5"><Calendar className="size-3.5" /> Est. {new Date(order.tentative_delivery_date).toLocaleDateString("en-US", { dateStyle: "medium" })}</div>}
        </Card>
      )}

      {order.notes && (
        <Card label="Notes"><div className="text-sm">{order.notes}</div></Card>
      )}

      {/* Internal notes */}
      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-5 mb-4">
        <div className="font-bold text-[14px] mb-3 flex items-center gap-1.5"><StickyNote className="size-4" /> Internal Notes <span className="text-[11px] font-normal text-ink-4">Not visible to customer</span></div>
        {notes.length === 0 && <p className="text-[13px] text-ink-4 mb-3">No notes yet.</p>}
        {notes.map((note: any) => (
          <div key={note.id} className="rounded-xl bg-canvas px-3 py-2.5 mb-2">
            <div className="text-[13px]">{note.content}</div>
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-[11px] text-ink-4">{note.staff_name} · {new Date(note.created_at).toLocaleString()}</span>
              <button onClick={() => deleteNoteMutation.mutate(note.id)} className="text-[11px] text-red-500 hover:text-red-600 inline-flex items-center gap-1"><Trash2 className="size-3" /> Delete</button>
            </div>
          </div>
        ))}
        <textarea ref={noteRef} className={taCls + " mt-1 mb-2"} rows={2} placeholder="Add an internal note..." value={newNote} onChange={e => setNewNote(e.target.value)} />
        <button onClick={() => addNoteMutation.mutate(newNote)} disabled={!newNote.trim() || addNoteMutation.isPending}
          className="w-full h-11 rounded-full border border-border text-sm font-semibold text-ink-2 hover:bg-canvas transition-colors disabled:opacity-60">
          {addNoteMutation.isPending ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Add Note"}
        </button>
      </div>

      {/* Cancel */}
      {canCancel && (
        <button onClick={() => setShowCancel(true)} className="w-full h-12 rounded-full border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors mb-6">
          Cancel Order
        </button>
      )}

      {showCancel && (
        <ConfirmDialog
          title="Cancel order?"
          message={
            <div className="space-y-2">
              <div>This cannot be undone. Optionally provide a reason.</div>
              <textarea className={taCls} rows={3} placeholder="Reason for cancellation (optional)" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            </div>
          }
          confirmLabel="Confirm cancel" cancelLabel="Keep order"
          loading={cancelMutation.isPending} error={actionError}
          onConfirm={() => cancelMutation.mutate(cancelReason)}
          onCancel={() => { setShowCancel(false); setActionError(""); }}
        />
      )}
    </>
  );
}

const TONE: Record<string, string> = {
  teal: "bg-teal-50 text-primary", amber: "bg-amber-50 text-amber-600",
  green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600",
  neutral: "bg-canvas text-ink-3",
};
function ActionCard({ icon, tone, title, children }: { icon: React.ReactNode; tone: keyof typeof TONE | string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-5 mb-4">
      <div className="flex items-center gap-2.5 mb-4">
        <span className={`flex size-8 items-center justify-center rounded-lg shrink-0 ${TONE[tone] || TONE.neutral}`}>{icon}</span>
        <h3 className="font-bold text-[15px]">{title}</h3>
      </div>
      {children}
    </div>
  );
}
function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-4 mb-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-4 mb-2">{label}</div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-3"><label className="text-[13px] font-semibold text-ink-2 mb-1.5 block">{label}</label>{children}</div>;
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between text-[13px]"><span className="text-ink-3">{label}</span><span>{value}</span></div>;
}
function PrimaryBtn({ children, onClick, loading, disabled }: { children: React.ReactNode; onClick: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-colors disabled:opacity-60">
      {loading ? <Loader2 className="size-5 animate-spin" /> : children}
    </button>
  );
}
