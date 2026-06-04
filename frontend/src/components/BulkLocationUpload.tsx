/**
 * BulkLocationUpload — parse CSV or Excel into delivery location rows.
 * Shows a preview before importing. Downloadable template included.
 */
import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface LocationRow {
  label: string;
  address: string;
  city: string;
  state: string;
  _error?: string;
}

interface Props {
  onLocations: (rows: LocationRow[]) => void;
  onClose: () => void;
}

export function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["label", "address", "city", "state"],
    ["Factory A", "Plot 12 MIDC Industrial Area", "Mumbai", "Maharashtra"],
    ["Warehouse North", "NH8 Industrial Estate", "Delhi", "Delhi"],
    ["Plant 3", "GIDC Estate Phase 2", "Ahmedabad", "Gujarat"],
  ]);
  ws["!cols"] = [{ wch: 20 }, { wch: 35 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, "Locations");
  XLSX.writeFile(wb, "locations_template.xlsx");
}

function normalise(raw: Record<string, string>): LocationRow {
  const get = (key: string) =>
    (raw[key] || raw[key.toUpperCase()] || raw[key.charAt(0).toUpperCase() + key.slice(1)] || "").trim();
  return {
    label:   get("label") || "Delivery Location",
    address: get("address"),
    city:    get("city"),
    state:   get("state"),
    _error:  !get("city") && !get("address") ? "Missing city and address" : undefined,
  };
}

export default function BulkLocationUpload({ onLocations, onClose }: Props) {
  const fileRef                     = useRef<HTMLInputElement>(null);
  const [rows,     setRows]         = useState<LocationRow[]>([]);
  const [parsed,   setParsed]       = useState(false);
  const [error,    setError]        = useState("");
  const [fileName, setFileName]     = useState("");

  const handleFile = (file: File) => {
    setError("");
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => { setRows((r.data as Record<string, string>[]).map(normalise)); setParsed(true); },
        error: () => setError("Could not parse CSV. Please check the file format."),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb   = XLSX.read(e.target?.result, { type: "binary" });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
          setRows(data.map(normalise)); setParsed(true);
        } catch { setError("Could not read Excel file. Please use the provided template."); }
      };
      reader.readAsBinaryString(file);
    } else {
      setError("Unsupported file. Please upload .csv or .xlsx");
    }
  };

  const validRows   = rows.filter(r => !r._error);
  const invalidRows = rows.filter(r => r._error);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
      display: "flex", alignItems: "flex-end", zIndex: 400,
    }}>
      <div style={{
        background: "var(--bg)", borderRadius: "20px 20px 0 0",
        width: "100%", maxHeight: "90dvh", overflow: "auto",
        padding: "20px 16px calc(env(safe-area-inset-bottom) + 20px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>Bulk Upload Locations</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--ink-3)" }}>✕</button>
        </div>

        {!parsed ? (
          <>
            <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.6 }}>
              Upload a CSV or Excel file with columns: <strong>label, address, city, state</strong>
            </p>
            <button className="btn btn-secondary btn-full" style={{ marginBottom: 10, justifyContent: "center" }}
              onClick={downloadTemplate}>
              ⬇️ Download Template (.xlsx)
            </button>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${fileName ? "var(--blue)" : "var(--border)"}`,
                borderRadius: "var(--radius)", padding: "28px 16px",
                textAlign: "center", cursor: "pointer",
                background: fileName ? "var(--blue-light,#eff6ff)" : "var(--surface)",
                marginBottom: 10,
              }}
            >
              {fileName
                ? <div style={{ fontSize: 13, fontWeight: 600, color: "var(--blue)" }}>📎 {fileName}<br /><span style={{ fontSize: 11, fontWeight: 400, color: "var(--ink-3)" }}>Tap to change</span></div>
                : <><div style={{ fontSize: 28, marginBottom: 6 }}>📂</div><div style={{ fontSize: 13, fontWeight: 600 }}>Tap to select file</div><div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>CSV or Excel (.csv, .xlsx)</div></>
              }
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            {error && <div className="alert alert-error">{error}</div>}
          </>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <span className="badge badge-green">{validRows.length} valid</span>
              {invalidRows.length > 0 && <span className="badge badge-amber" style={{ marginLeft: 8 }}>{invalidRows.length} skipped</span>}
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 12 }}>
              {rows.map((row, i) => (
                <div key={i} style={{
                  padding: "8px 10px", borderRadius: "var(--radius)", marginBottom: 6,
                  background: row._error ? "var(--amber-light,#fffbeb)" : "var(--surface)",
                  border: `1px solid ${row._error ? "var(--amber,#f59e0b)" : "var(--border)"}`,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    {[row.address, row.city, row.state].filter(Boolean).join(", ") || "—"}
                  </div>
                  {row._error && <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>⚠️ {row._error} — will be skipped</div>}
                </div>
              ))}
            </div>
            {validRows.length === 0
              ? <div className="alert alert-error" style={{ marginBottom: 10 }}>No valid rows. Please check your file.</div>
              : <button className="btn btn-primary btn-full" style={{ marginBottom: 8 }} onClick={() => onLocations(validRows)}>
                  ✅ Add {validRows.length} Location{validRows.length !== 1 ? "s" : ""}
                </button>
            }
            <button className="btn btn-secondary btn-full"
              onClick={() => { setParsed(false); setRows([]); setFileName(""); }}>
              ← Upload different file
            </button>
          </>
        )}
      </div>
    </div>
  );
}
