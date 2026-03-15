import { useState } from "react";
import ReportModal from "./ReportModal";

export default function ReportButton({ targetType, targetId, className = "" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`text-slate-300 hover:text-red-400 transition text-sm
                    p-1 rounded hover:bg-red-50 ${className}`}
        title="Zgłoś treść"
        aria-label="Zgłoś tę treść do moderacji"
      >
        ⚑
      </button>

      {open && (
        <ReportModal
          targetType={targetType}
          targetId={targetId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
