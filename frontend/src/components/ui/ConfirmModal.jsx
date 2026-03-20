import { createPortal } from "react-dom";
import Button from "./Button";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
  danger = true,
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div
        className="bg-[var(--zp-app-card)] rounded-2xl border border-[var(--zp-app-border)] p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-modal-title"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2"
        >
          {title}
        </h2>
        <p id="confirm-modal-desc" className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {message}
        </p>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? "danger" : "primary"}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
