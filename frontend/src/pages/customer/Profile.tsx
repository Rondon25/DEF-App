import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import { getCustomerUser, setCustomerAuth, clearCustomerAuth, getCustomerToken } from "../../hooks/useAuth";
import BulkLocationUpload, { type LocationRow } from "../../components/BulkLocationUpload";
import type { DeliveryLocation } from "../../hooks/useAuth";

interface LocationForm { label: string; address: string; city: string; state: string; }
const emptyForm = (): LocationForm => ({ label: "", address: "", city: "", state: "" });

export default function Profile() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const customer  = getCustomerUser();

  const [name,    setName]    = useState(customer?.name || "");
  const [company, setCompany] = useState(customer?.company_name || "");
  const [address, setAddress] = useState(customer?.address || "");
  const [city,    setCity]    = useState(customer?.city || "");
  const [state, setState] = useState(customer?.state || "");
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  // Additional locations state
  const [addingLoc,  setAddingLoc]  = useState(false);
  const [showBulk,   setShowBulk]   = useState(false);
  const [newLoc,     setNewLoc]     = useState<LocationForm>(emptyForm());
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [editLoc,    setEditLoc]    = useState<LocationForm>(emptyForm());
  const [locError,   setLocError]   = useState("");

  const { data: locations = [], isLoading: locsLoading } = useQuery<DeliveryLocation[]>({
    queryKey: ["my-locations"],
    queryFn: () => api.get("/auth/me/locations").then(r => r.data),
  });

  const profileMutation = useMutation({
    mutationFn: (body: any) => api.patch("/auth/me", body).then(r => r.data),
    onSuccess: (updated) => {
      const token = getCustomerToken()!;
      setCustomerAuth(token, updated);
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: any) => setError(err.response?.data?.detail || "Update failed"),
  });

  const addLocMutation = useMutation({
    mutationFn: (body: LocationForm) => api.post("/auth/me/locations", {
      label: body.label || "Factory Location",
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-locations"] });
      setNewLoc(emptyForm());
      setAddingLoc(false);
      setLocError("");
    },
    onError: (err: any) => setLocError(err.response?.data?.detail || "Failed to add location"),
  });

  const editLocMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: LocationForm }) =>
      api.patch(`/auth/me/locations/${id}`, {
        label: body.label || "Factory Location",
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-locations"] });
      setEditingId(null);
      setLocError("");
    },
    onError: (err: any) => setLocError(err.response?.data?.detail || "Failed to update location"),
  });

  const deleteLocMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/auth/me/locations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-locations"] }),
    onError: (err: any) => setLocError(err.response?.data?.detail || "Failed to delete location"),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(false);
    profileMutation.mutate({ name, company_name: company, address, city, state });
  };

  const startEdit = (loc: DeliveryLocation) => {
    setEditingId(loc.id);
    setEditLoc({ label: loc.label, address: loc.address || "", city: loc.city || "", state: loc.state || "" });
    setLocError("");
  };

  return (
    <>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>{customer?.phone_number}</p>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "var(--blue)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700,
          }}>
            {customer?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{customer?.name}</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{customer?.company_name || "Customer"}</div>
            <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 2 }}>
              {customer?.is_credit_account ? "Credit account" : "Cash account"}
            </div>
          </div>
        </div>
      </div>

      {/* Personal details */}
      <form onSubmit={handleSave}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: "var(--ink-2)" }}>Edit Details</div>

          <div className="form-group">
            <label>Full name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Company name</label>
            <input className="input" value={company} onChange={e => setCompany(e.target.value)} placeholder="Optional" />
          </div>

          {/* Main delivery address */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", letterSpacing: "0.05em", marginBottom: 8, marginTop: 4 }}>
            MAIN DELIVERY ADDRESS
          </div>
          <div className="form-group">
            <label>Address</label>
            <input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Plot 12, MIDC Industrial Area" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="form-group">
              <label>City</label>
              <input className="input" value={city} onChange={e => setCity(e.target.value)} placeholder="Mumbai" />
            </div>
            <div className="form-group">
              <label>State</label>
              <input className="input" value={state} onChange={e => setState(e.target.value)} placeholder="Maharashtra" />
            </div>
          </div>

          {error   && <div className="alert alert-error"   style={{ marginBottom: 10 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 10 }}>Profile updated</div>}

          <button className="btn btn-primary btn-full" type="submit" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? <span className="spinner" /> : "Save changes"}
          </button>
        </div>
      </form>

      {/* Additional delivery locations */}
      <div className="card" style={{ padding: 16, marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink-2)" }}>Additional Delivery Locations</div>
          {!addingLoc && (
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: "5px 10px" }}
                onClick={() => setShowBulk(true)}>
                📂 Bulk
              </button>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: "5px 10px" }}
                onClick={() => { setAddingLoc(true); setLocError(""); }}>
                + Add
              </button>
            </div>
          )}
        </div>

        {locError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{locError}</div>}

        {locsLoading ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}><span className="spinner spinner-dark" /></div>
        ) : locations.length === 0 && !addingLoc ? (
          <p style={{ fontSize: 13, color: "var(--ink-4)", textAlign: "center", padding: "8px 0" }}>
            No additional locations yet
          </p>
        ) : (
          locations.map(loc => (
            <div key={loc.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 12 }}>
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
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: 13 }}
                      onClick={() => editLocMutation.mutate({ id: loc.id, body: editLoc })}
                      disabled={editLocMutation.isPending}
                    >
                      {editLocMutation.isPending ? <span className="spinner" /> : "Save"}
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{loc.label}</div>
                    {loc.address && <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{loc.address}</div>}
                    {(loc.city || loc.state) && (
                      <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                        {[loc.city, loc.state].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 8 }}>
                    <button
                      style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 13, cursor: "pointer", padding: 0, fontWeight: 600 }}
                      onClick={() => startEdit(loc)}
                    >
                      Edit
                    </button>
                    <button
                      style={{ background: "none", border: "none", color: "var(--red, #ef4444)", fontSize: 13, cursor: "pointer", padding: 0, fontWeight: 600 }}
                      onClick={() => deleteLocMutation.mutate(loc.id)}
                      disabled={deleteLocMutation.isPending}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Add new location form */}
        {addingLoc && (
          <div style={{ borderTop: locations.length > 0 ? "1px solid var(--border)" : "none", paddingTop: locations.length > 0 ? 12 : 0 }}>
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
              <button
                className="btn btn-primary"
                style={{ flex: 1, fontSize: 13 }}
                onClick={() => addLocMutation.mutate(newLoc)}
                disabled={addLocMutation.isPending}
              >
                {addLocMutation.isPending ? <span className="spinner" /> : "Save location"}
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={() => { setAddingLoc(false); setNewLoc(emptyForm()); }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16, marginTop: 8 }}>
        <button
          className="btn btn-secondary btn-full"
          style={{ color: "var(--red, #ef4444)" }}
          onClick={() => { clearCustomerAuth(); navigate("/login"); }}
        >
          Sign out
        </button>
      </div>

      {showBulk && (
        <BulkLocationUpload
          onClose={() => setShowBulk(false)}
          onLocations={async (rows: LocationRow[]) => {
            for (const row of rows) {
              await api.post("/auth/me/locations", {
                label: row.label, address: row.address || null,
                city: row.city || null, state: row.state || null,
              }).catch(() => {});
            }
            qc.invalidateQueries({ queryKey: ["my-locations"] });
            setShowBulk(false);
          }}
        />
      )}
    </>
  );
}
