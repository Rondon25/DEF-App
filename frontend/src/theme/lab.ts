/* ─────────────────────────────────────────────────────────────────────────────
   LAB DESIGN TOKENS — the new staff-side visual system (from the Figma dashboard).
   Kept as a TS module for Phase 0 so it's opt-in per component and doesn't touch
   existing pages. Phase 1 promotes these into global CSS variables.
   ───────────────────────────────────────────────────────────────────────────── */
export const LAB = {
  sidebar: "#15151B",
  sidebar2: "#1F1F27",
  canvas: "#F3F3F2",
  card: "#FFFFFF",
  accent: "#E4F060",   // vivid lime
  chart: "#B4CC3C",    // chart green
  limeSoft: "#FAFCE0",
  ink: "#16161C",
  sub: "#8A8A93",
  border: "#ECECEA",
  red: "#E5484D",
} as const;

export const CARD_SHADOW = "0 1px 2px rgba(16,16,28,.04), 0 1px 3px rgba(16,16,28,.06)";

/** Categorical series for donuts / multi-series charts. */
export const SERIES = [LAB.accent, "#16161C", LAB.chart, "#C9CDD4", "#6B6B73"];
