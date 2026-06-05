/**
 * Skeleton loading components for key pages.
 */

const pulse = {
  background: "linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%)",
  backgroundSize: "200% 100%",
  animation: "skeleton-pulse 1.4s ease infinite",
  borderRadius: 8,
} as React.CSSProperties;

// Inject keyframes once
if (typeof document !== "undefined" && !document.getElementById("skeleton-styles")) {
  const style = document.createElement("style");
  style.id = "skeleton-styles";
  style.textContent = `@keyframes skeleton-pulse { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;
  document.head.appendChild(style);
}

export function SkeletonLine({ width = "100%", height = 16 }: { width?: string | number; height?: number }) {
  return <div style={{ ...pulse, width, height, marginBottom: 8 }} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card" style={{ padding: 16, marginBottom: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === 0 ? "60%" : i === lines - 1 ? "40%" : "100%"} />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ ...pulse, width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <SkeletonLine width="55%" height={14} />
            <SkeletonLine width="35%" height={12} />
          </div>
          <SkeletonLine width={48} height={14} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonKPIs({ count = 4 }: { count?: number }) {
  return (
    <div className="kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="kpi-card">
          <SkeletonLine width="60%" height={12} />
          <SkeletonLine width="40%" height={28} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonOrderDetail() {
  return (
    <>
      <SkeletonCard lines={2} />
      <SkeletonCard lines={4} />
      <SkeletonList rows={3} />
    </>
  );
}
