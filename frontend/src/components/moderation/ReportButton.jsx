import { useState } from "react";
import ReportModal from "./ReportModal";
import { useTranslation } from "react-i18next";

export default function ReportButton({ targetType, targetId, className = "" }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("app");

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
        title={t("report.title")}
        aria-label={t("report.ariaLabel")}
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
