import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";
import { getStaffUser } from "../../hooks/useAuth";

const STATUS_BADGE: Record<string, string> = {
  submitted:         "badge-blue",
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

const STATUS_LABEL: Record<string, string> = {
  submitted:         "Submitted",
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

const CUSTOMER_STATUS_BADGE: Record<string, string> = {
  pending:   "badge-amber",
  active:    "badge-green",
  suspended: "badge-gray",
  rejected:  "badge-gray",
};

interface Location { id: number; label: string; address: string | null; city: string | null; state: string | null; is_primary: boolean; }
interface LocForm { label: string; address: string; city: string; state: string; }
const emptyLocForm = (): LocForm => ({ label: "", address: "", city: "", state: "" });

export default function CustomerDetail() {
  const { id } = useParams();
  const qc     = useQueryClient();
  const user   = getStaffUser();
  const canEdit = ["admin","central_team"].includes(user?.role || "");

  const [addingLoc, setAddingLoc] = useState(false);
  const [newLoc,    setNewLoc]    = useState<LocForm>(emptyLocForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLoc,   setEditLoc]   = useState<LocForm>(emptyLocForm());
  const [locError,  setLocError]  = useState("");

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => staffApi.get(`/customers/${id}`).then(r => r.data),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["customer-orders", id],
    queryFn: () => staffApi.get(`/customers/${id}/orders`).then(r => r.data),
  });

  const { data: locations = [], isLoading: locsLoading } = useQuery<Location[]>({
    queryKey: ["customer-locations", id],
    queryFn: () => staffApi.get(`/customers/${id}/locations`).then(r => r.data),
    enabled: !!id,
  });

  const suspendMutation = useMutation({
    mutationFn: () => staffApi.patch(`/customers/${id}`, { status: "suspended" }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer", id] }),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => staffApi.post(`/customers/${id}/approve`, {}).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer", id] }),
  });

  const addLocMutation = useMutation({
    mutationFn: (body: LocForm) => staffApi.post(`/customers/${id}/locations`, {
      label: body.label || "Factory Location",
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-locations", id] });
      setNewLoc(emptyLocForm());
      setAddingLoc(false);
      setLocError("");
    },
    onError: (err: any) => setLocError(err.response?.data?.detail || "Failed to add location"),
  });

  const editLocMutation = useMutation({
    mutationFn: ({ locId, body }: { locId: number; body: LocForm }) =>
      staffApi.patch(`/customers/${id}/locations/${locId}`, {
        label: body.label || "Factory Location",
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-locations", id] });
      setEditingId(null);
      setLocError("");
    },
    onError: (err: any) => setLocError(err.response?.data?.detail || "Failed to update location"),
  });

  const deleteLocMutation = useMutation({
    mutationFn: (locId: number) => staffApi.delete(`/customers/${id}/locations/${locId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-locations", id] }),
    onError: (err: any) => setLocError(err.response?.data?.detail || "Failed to delete location"),
  });

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setEditLoc({ label: loc.label, address: loc.address || "", city: loc.city || "", state: loc.state || "" });
    setLocError("");
  };

  if (isLoading) return <div className="loading-screen"><span className="spinner spinner-dark" /></div>;
  if (!customer) return <div className="empty-state"><div className="empty-icon">❌</div><p>Customer not found</p></div>;

  const totalSpent   = orders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  const activeOrders = orders.filter((o: any) => !["closed","cancelled"].includes(o.status));

  return (
    <>
      <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/staff/customers" style={{ color: "var(--ink-3)", textDecoration: "none", fontSize: 20 }}>←</Link>
        <div>
          <h1>{customer.name}</h1>
          <span className={`badge ${CUSTOMER_STATUS_BADGE[customer.status] || "badge-gray"}`} style={{ textTransform: "capitalize" }}>
            {customer.status}
          </span>
        </div>
      </div>

      {/* Profile card */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "var(--blue)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 700, flexShrink: 0,
          }}>
            {customer.name[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{customer.name}</div>
            {customer.company_name && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{customer.company_name}</div>}
            <div style={{ fontSize: 13, color: "var(--blue)", fontWeight: 600 }}>{customer.phone_number}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(customer.city || customer.state) && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--ink-3)" }}>Location</span>
              <span>{[customer.city, customer.state].filter(Boolean).join(", ")}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--ink-3)" }}>Registered</span>
            <span>{new Date(customer.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Orders</div>
          <div className="kpi-value">{orders.length}</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{activeOrders.length}</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Spent</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>${totalSpent.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
        </div>
      </div>

      {/* Delivery Locations */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Delivery Locations</div>
          {canEdit && !addingLoc && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: 13, padding: "6px 12px" }}
              onClick={() => { setAddingLoc(true); setLocError(""); }}
            >
              + Add
            </button>
          )}
        </div>

        {locError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{locError}</div>}

        {/* Primary address from customer record */}
        {(customer.address || customer.city || customer.state) && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Main Address</span>
                <span className="badge badge-blue" style={{ fontSize: 11 }}>Primary</span>
              </div>
              {customer.address && <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{customer.address}</div>}
              {(customer.city || customer.state) && (
                <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                  {[customer.city, customer.state].filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional locations */}
        {locsLoading ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}><span className="spinner spinner-dark" /></div>
        ) : (
          locations.map(loc => (
            <div key={loc.id} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid var(--border)" }}>
              {editingId === loc.id ? (
                <div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label>Location name</label>
                    <input className="input" value={editLoc.label} onChange={e => setEditLoc(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Factory A" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label>Address</label>
                    <input className="input" value={editLoc.address} onChange={e => setEditLoc(p => ({ ...p, address: e.target.value }))} placeholder="Plot 12, MIDC Industrial Area" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>City</label>
                      <input className="input" value={editLoc.city} onChange={e => setEditLoc(p => ({ ...p, city: e.target.value }))} placeholder="Mumbai" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>State</label>
                      <input className="input" value={editLoc.state} onChange={e => setEditLoc(p => ({ ...p, state: e.target.value }))} placeholder="Maharashtra" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1, fontSize: 13 }}
                      onClick={() => editLocMutation.mutate({ locId: loc.id, body: editLoc })}
                      disabled={editLocMutation.isPending}>
                      {editLocMutation.isPending ? <span className="spinner" /> : "Save"}
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{loc.label}</div>
                    {loc.address && <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{loc.address}</div>}
                    {(loc.city || loc.state) && (
                      <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{[loc.city, loc.state].filter(Boolean).join(", ")}</div>
                    )}
                  </div>
                  {canEdit && (
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 8 }}>
                      <button style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 13, cursor: "pointer", fontWeight: 600 }} onClick={() => startEdit(loc)}>Edit</button>
                      <button style={{ background: "none", border: "none", color: "var(--red,#ef4444)", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
                        onClick={() => deleteLocMutation.mutate(loc.id)} disabled={deleteLocMutation.isPending}>Delete</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {!customer.address && !customer.city && !customer.state && locations.length === 0 && !addingLoc && (
          <p style={{ fontSize: 13, color: "var(--ink-4)", textAlign: "center", padding: "4px 0" }}>No delivery locations on file</p>
        )}

        {/* Add new location form */}
        {addingLoc && (
          <div style={{ borderTop: (customer.address || locations.length > 0) ? "1px solid var(--border)" : "none", paddingTop: (customer.address || locations.length > 0) ? 12 : 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "var(--ink-2)" }}>New Location</div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label>Location name</label>
              <input className="input" value={newLoc.label} onChange={e => setNewLoc(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Factory A, Warehouse North" />
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label>Address</label>
              <input className="input" value={newLoc.address} onChange={e => setNewLoc(p => ({ ...p, address: e.target.value }))} placeholder="Plot 12, MIDC Industrial Area" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>City</label>
                <input className="input" value={newLoc.city} onChange={e => setNewLoc(p => ({ ...p, city: e.target.value }))} placeholder="Mumbai" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>State</label>
                <input className="input" value={newLoc.state} onChange={e => setNewLoc(p => ({ ...p, state: e.target.value }))} placeholder="Maharashtra" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1, fontSize: 13 }}
                onClick={() => addLocMutation.mutate(newLoc)} disabled={addLocMutation.isPending}>
                {addLocMutation.isPending ? <span className="spinner" /> : "Save location"}
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={() => { setAddingLoc(false); setNewLoc(emptyLocForm()); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {canEdit && customer.status !== "rejected" && (
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", marginBottom: 10 }}>ACCOUNT ACTIONS</div>
          <div style={{ display: "flex", gap: 8 }}>
            {customer.status === "active" && (
              <button
                className="btn btn-secondary btn-full"
                style={{ color: "var(--red,#ef4444)" }}
                onClick={() => suspendMutation.mutate()}
                disabled={suspendMutation.isPending}
              >
                Suspend Account
              </button>
            )}
            {customer.status === "suspended" && (
              <button
                className="btn btn-primary btn-full"
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending}
              >
                Reactivate Account
              </button>
            )}
          </div>
        </div>
      )}

      {/* Order history */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "14px 16px 0", fontWeight: 700, fontSize: 14 }}>
          Order History
          <span style={{ fontWeight: 400, fontSize: 12, color: "var(--ink-3)", marginLeft: 6 }}>({orders.length})</span>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state" style={{ padding: "24px 16px" }}>
            <div className="empty-icon" style={{ fontSize: 28 }}>📋</div>
            <p>No orders yet</p>
          </div>
        ) : (
          orders.map((order: any) => (
            <Link
              key={order.id}
              to={`/staff/orders/${order.id}`}
              className="list-item"
              style={{ display: "flex", textDecoration: "none" }}
            >
              <div className="list-item-icon">📋</div>
              <div className="list-item-body">
                <div className="list-item-title">{order.order_number}</div>
                <div className="list-item-sub" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span className={`badge ${STATUS_BADGE[order.status] || "badge-gray"}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                  <span>·</span>
                  <span>{new Date(order.created_at).toLocaleDateString("en-US", { dateStyle: "short" })}</span>
                </div>
              </div>
              <div className="list-item-right">
                <div className="list-item-amount">${order.total_amount?.toFixed(2)}</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
