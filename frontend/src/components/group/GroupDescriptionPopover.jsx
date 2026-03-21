/**
 * Ikona informacji obok nazwy grupy; po najechaniu pokazuje panel z opisem AI (wypunktowane objawy).
 * Znika, gdy kursor opuści ikonę i panel.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";

function parseLines(description) {
  if (!description || typeof description !== "string") return [];
  return description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export default function GroupDescriptionPopover({ description }) {
  const { t } = useTranslation("app");
  const [open, setOpen] = useState(false);
  const items = parseLines(description);

  if (!description || items.length === 0) return null;

  return (
    <span
      className="relative inline-flex items-center align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="p-0.5 rounded-md text-slate-400 hover:text-zebra-600 dark:hover:text-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zebra-500/60"
        aria-expanded={open}
        aria-label={t("groupDescriptionPopover.openLabel")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg dark:border-slate-600 dark:bg-slate-800"
        >
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            {t("groupDescriptionPopover.title")}
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
            {items.map((line, i) => (
              <li key={i} className="marker:text-zebra-500 dark:marker:text-teal-400">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
