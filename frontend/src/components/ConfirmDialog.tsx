import { AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title, message, confirmLabel = "Confirm", cancelLabel = "Cancel",
  destructive = true, loading = false, error, onConfirm, onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="w-full max-w-[420px] bg-surface rounded-2xl shadow-[var(--shadow-lg)] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3.5 mb-4">
          <span className={`flex size-10 items-center justify-center rounded-full shrink-0 ${destructive ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h3 className="font-bold text-[16px] mb-1">{title}</h3>
            <div className="text-sm text-ink-3 leading-relaxed">{message}</div>
          </div>
        </div>
        {error && <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 mb-3 text-[13px] text-red-700">{error}</div>}
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 h-11 rounded-full border border-border text-sm font-semibold text-ink-2 hover:bg-canvas transition-colors">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 h-11 rounded-full text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 ${
              destructive ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-teal-700"
            }`}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
