import { Badge } from "@/components/ui/badge";

/**
 * Single source of truth for order-status presentation.
 * Fixes the "inconsistent components across screens" problem —
 * every screen now renders statuses identically.
 */

type Tone = "neutral" | "teal" | "green" | "amber" | "red" | "blue" | "purple";

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  draft:              { label: "Draft",            tone: "neutral" },
  submitted:          { label: "Submitted",        tone: "blue" },
  verified:           { label: "Verified",         tone: "blue" },
  proforma_sent:      { label: "Invoice Sent",     tone: "amber" },
  payment_uploaded:   { label: "Payment Uploaded", tone: "amber" },
  payment_verified:   { label: "Payment Verified", tone: "teal" },
  confirmed:          { label: "Confirmed",        tone: "teal" },
  in_production:      { label: "In Production",    tone: "purple" },
  ready_for_dispatch: { label: "Ready to Ship",    tone: "purple" },
  shipped:            { label: "Shipped",          tone: "purple" },
  delivered:          { label: "Delivered",        tone: "green" },
  grn_pending:        { label: "Confirm Receipt",  tone: "amber" },
  grn_submitted:      { label: "GRN Submitted",    tone: "green" },
  closed:             { label: "Closed",           tone: "neutral" },
  cancelled:          { label: "Cancelled",        tone: "red" },
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, tone: "neutral" as Tone };
  return <Badge tone={cfg.tone} className={className}>{cfg.label}</Badge>;
}

export const statusLabel = (status: string) => STATUS_MAP[status]?.label ?? status;
