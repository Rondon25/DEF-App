/**
 * BulkSkuUpload — parse CSV or Excel into SKU rows for catalogue import.
 * Preview before importing. Downloadable template included.
 */
import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { X, Download, FolderOpen, Paperclip, AlertTriangle, Check } from "lucide-react";

export interface SkuRow {
  code: string;
  name: string;
  description: string;
  volume_liters: number;
  unit: string;
  current_price: number;
  _error?: string;
}

interface Props {
  onSkus: (rows: SkuRow[]) => void;
  onClose: () => void;
}

export function downloadSkuTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["code", "name", "description", "volume_liters", "unit", "current_price"],
    ["DEF-5L", "DEF 5L", "Diesel Exhaust Fluid — 5 litre container", 5, "unit", 6.0],
    ["DEF-200L", "DEF 200L", "Bulk drum for large fleets", 200, "drum", 160.0],
    ["DEF-BULK", "DEF Bulk", "Tanker delivery, per litre", 0, "litre", 0.52],
  ]);
  ws["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 40 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, "SKUs");
  XLSX.writeFile(wb, "catalogue_template.xlsx");
}

function normalise(raw: Record<string, any>): SkuRow {
  const get = (k: string) => {
    const v = raw[k] ?? raw[k.toUpperCase()] ?? raw[k.charAt(0).toUpperCase() + k.slice(1)];
    return v == null ? "" : String(v).trim();
  };
  const code = get("code");
  const name = get("name");
  const price = parseFloat(get("current_price") || get("price") || "0");
  let err: string | undefined;
  if (!code) err = "Missing SKU code";
  else if (!name) err = "Missing name";
  else if (isNaN(price) || price < 0) err = "Invalid price";
  return {
    code,
    name,
    description: get("description"),
    volume_liters: parseFloat(get("volume_liters") || get("volume") || "0") || 0,
    unit: get("unit") || "unit",
    current_price: isNaN(price) ? 0 : price,
    _error: err,
  };
}

export default function BulkSkuUpload({ onSkus, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows]         = useState<SkuRow[]>([]);
  const [parsed, setParsed]     = useState(false);
  const [error, setError]       = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = (file: File) => {
    setError("");
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (r) => { setRows((r.data as Record<string, any>[]).map(normalise)); setParsed(true); },
        error: () => setError("Could not parse CSV. Please check the file format."),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
          setRows(data.map(normalise)); setParsed(true);
        } catch { setError("Could not read Excel file. Please use the provided template."); }
      };
      reader.readAsBinaryString(file);
    } else {
      setError("Unsupported file. Please upload .csv or .xlsx");
    }
  };

  const valid = rows.filter((r) => !r._error);
  const invalid = rows.filter((r) => r._error);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "flex-end", zIndex: 400 }}>
      <div style={{ background: "var(--bg)", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "90dvh", overflow: "auto", padding: "20px 16px calc(env(safe-area-inset-bottom) + 20px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>Bulk Add SKUs</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", display: "flex" }}><X size={20} /></button>
        </div>

        {!parsed ? (
          <>
            <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.6 }}>
              Upload a CSV or Excel file with columns: <strong>code, name, description, volume_liters, unit, current_price</strong>
            </p>
            <button className="btn btn-secondary btn-full" style={{ marginBottom: 10, justifyContent: "center", gap: 6 }} onClick={downloadSkuTemplate}>
              <Download size={16} /> Download Template (.xlsx)
            </button>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${fileName ? "var(--blue)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "28px 16px", textAlign: "center", cursor: "pointer", background: fileName ? "var(--blue-light,#f0fdfa)" : "var(--surface)", marginBottom: 10 }}
            >
              {fileName
                ? <div style={{ fontSize: 13, fontWeight: 600, color: "var(--blue)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Paperclip size={15} /> {fileName}</span><span style={{ fontSize: 11, fontWeight: 400, color: "var(--ink-3)" }}>Tap to change</span></div>
                : <><div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: "var(--ink-4)" }}><FolderOpen size={28} /></div><div style={{ fontSize: 13, fontWeight: 600 }}>Tap to select file</div><div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>CSV or Excel (.csv, .xlsx)</div></>
              }
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            {error && <div className="alert alert-error">{error}</div>}
          </>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <span className="badge badge-green">{valid.length} valid</span>
              {invalid.length > 0 && <span className="badge badge-amber" style={{ marginLeft: 8 }}>{invalid.length} skipped</span>}
            </div>
            <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 12 }}>
              {rows.map((row, i) => (
                <div key={i} style={{ padding: "8px 10px", borderRadius: "var(--radius)", marginBottom: 6, background: row._error ? "var(--amber-light,#fffbeb)" : "var(--surface)", border: `1px solid ${row._error ? "var(--amber,#f59e0b)" : "var(--border)"}` }}>
                  <div style={{ fontWeight: 600, fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                    {row.name || "—"} <span style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "monospace" }}>{row.code}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>${row.current_price.toFixed(2)} / {row.unit}{row.volume_liters ? ` · ${row.volume_liters}L` : ""}</div>
                  {row._error && <div style={{ fontSize: 11, color: "#b45309", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4 }}><AlertTriangle size={12} /> {row._error} — will be skipped</div>}
                </div>
              ))}
            </div>
            {valid.length === 0
              ? <div className="alert alert-error" style={{ marginBottom: 10 }}>No valid rows. Please check your file.</div>
              : <button className="btn btn-primary btn-full" style={{ marginBottom: 8, gap: 6 }} onClick={() => onSkus(valid)}>
                  <Check size={16} /> Import {valid.length} SKU{valid.length !== 1 ? "s" : ""}
                </button>
            }
            <button className="btn btn-secondary btn-full" onClick={() => { setParsed(false); setRows([]); setFileName(""); }}>
              ← Upload different file
            </button>
          </>
        )}
      </div>
    </div>
  );
}
