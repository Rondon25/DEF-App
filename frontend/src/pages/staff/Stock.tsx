import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api";

export default function Stock() {
  const qc = useQueryClient();
  const [editId,  setEditId]  = useState<number | null>(null);
  const [editQty, setEditQty] = useState("");

  const { data: skus = [], isLoading } = useQuery({
    queryKey: ["stock"],
    queryFn: () => staffApi.get("/admin/stock").then(r => r.data),
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, qty }: { id: number; qty: number | null }) =>
      staffApi.patch(`/admin/skus/${id}/stock`, { stock_qty: qty }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock"] });
      setEditId(null);
      setEditQty("");
    },
  });

  const statusColor = (status: string) =>
    status === "low" ? "var(--red,#ef4444)" : status === "unlimited" ? "var(--ink-4)" : "var(--green,#16a34a)";

  return (
    <>
      <div className="page-header">
        <h1>Stock</h1>
        <p>Inventory levels per product</p>
      </div>

      {isLoading ? (
        <div className="loading-screen"><span className="spinner spinner-dark" /></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {skus.map((sku: any) => (
            <div key={sku.id} style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: editId === sku.id ? 10 : 0 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{sku.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{sku.sku_code}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: statusColor(sku.status) }}>
                    {sku.stock_qty === null ? "Unlimited" : `${sku.stock_qty} ${sku.unit}`}
                  </div>
                  <button
                    onClick={() => { setEditId(sku.id); setEditQty(sku.stock_qty !== null ? String(sku.stock_qty) : ""); }}
                    style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 12, cursor: "pointer", fontWeight: 600, marginTop: 2 }}
                  >
                    Edit
                  </button>
                </div>
              </div>

              {editId === sku.id && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    placeholder="Qty (leave blank = unlimited)"
                    value={editQty}
                    onChange={e => setEditQty(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-primary"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({
                      id: sku.id,
                      qty: editQty === "" ? null : parseFloat(editQty),
                    })}
                  >
                    Save
                  </button>
                  <button className="btn btn-secondary" onClick={() => setEditId(null)}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
