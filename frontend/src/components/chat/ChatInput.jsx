import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";

const MAX_LENGTH = 500;

export default function ChatInput({ onSend, disabled = false }) {
  const { t } = useTranslation("app");
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    if (val.length > MAX_LENGTH) return;
    setValue(val);

    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  };

  const remaining = MAX_LENGTH - value.length;
  const isNearLimit = remaining < 50;

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              disabled ? t("chat.disconnected") : t("chat.placeholder")
            }
            rows={1}
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 pr-16 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100
                       focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400
                       resize-none overflow-hidden
                       disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500
                       placeholder:text-slate-400 dark:placeholder:text-slate-500 transition"
          />
          {isNearLimit && (
            <span className={`absolute right-3 bottom-2 text-xs ${
              remaining < 10 ? "text-red-500 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
            }`}>
              {remaining}
            </span>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 bg-teal-600 dark:bg-teal-500 hover:bg-teal-700 dark:hover:bg-teal-400 disabled:bg-slate-200 dark:disabled:bg-slate-700
                     disabled:text-slate-400 dark:disabled:text-slate-500 text-white dark:text-slate-900 p-2.5 rounded-xl transition
                     focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
          title={t("chat.sendTitle")}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

