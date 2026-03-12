import { useState, useRef } from "react";

const MAX_LENGTH = 500;

export default function ChatInput({ onSend, disabled = false }) {
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
    <div className="border-t bg-white p-3 sm:p-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={disabled
              ? "Połączenie przerwane..."
              : "Napisz wiadomość... (Enter = wyślij, Shift+Enter = nowa linia)"
            }
            rows={1}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-16 text-sm
                       focus:outline-none focus:ring-2 focus:ring-teal-500
                       resize-none overflow-hidden
                       disabled:bg-slate-50 disabled:text-slate-400
                       placeholder:text-slate-400 transition"
          />
          {isNearLimit && (
            <span className={`absolute right-3 bottom-2 text-xs ${
              remaining < 10 ? "text-red-500" : "text-slate-400"
            }`}>
              {remaining}
            </span>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200
                     disabled:text-slate-400 text-white p-2.5 rounded-xl transition
                     focus:outline-none focus:ring-2 focus:ring-teal-500"
          title="Wyślij (Enter)"
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

