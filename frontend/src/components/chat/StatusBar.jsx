import { WS_STATUS } from "../../hooks/useChat";
import { useTranslation } from "react-i18next";

const STATUS_CONFIG = {
  [WS_STATUS.CONNECTING]: { color: "bg-amber-400", labelKey: "chat.connecting", animate: true },
  [WS_STATUS.CONNECTED]: { color: "bg-emerald-400", labelKey: "chat.online", animate: false },
  [WS_STATUS.RECONNECTING]: {
    color: "bg-amber-400",
    labelKey: "chat.reconnecting",
    animate: true,
  },
  [WS_STATUS.DISCONNECTED]: {
    color: "bg-slate-400",
    labelKey: "chat.disconnectedLabel",
    animate: false,
  },
  [WS_STATUS.FAILED]: {
    color: "bg-red-400",
    labelKey: "chat.failed",
    animate: false,
  },
};

export default function StatusBar({
  status,
  onlineCount,
  groupName,
  onReconnect
}) {
  const { t } = useTranslation("app");
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[WS_STATUS.DISCONNECTED];

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${config.color} ${
              config.animate ? "animate-pulse" : ""
            }`}
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t(config.labelKey)}
          </span>
        </div>

        {status === WS_STATUS.CONNECTED && onlineCount > 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {t("chat.onlineCount", { count: onlineCount })}
          </span>
        )}

        {groupName && (
          <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500 truncate max-w-[160px]">
            · {groupName}
          </span>
        )}
      </div>

      {(status === WS_STATUS.FAILED || status === WS_STATUS.DISCONNECTED) && (
        <button
          onClick={onReconnect}
          className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline"
        >
          {t("chat.reconnect")}
        </button>
      )}
    </div>
  );
}

