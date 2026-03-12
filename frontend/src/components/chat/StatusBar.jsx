import { WS_STATUS } from "../../hooks/useChat";

const STATUS_CONFIG = {
  [WS_STATUS.CONNECTING]:   { color: "bg-amber-400", label: "Łączenie...",          animate: true  },
  [WS_STATUS.CONNECTED]:    { color: "bg-emerald-400", label: "Online",             animate: false },
  [WS_STATUS.RECONNECTING]: { color: "bg-amber-400", label: "Ponowne łączenie...",  animate: true  },
  [WS_STATUS.DISCONNECTED]: { color: "bg-slate-400", label: "Rozłączono",           animate: false },
  [WS_STATUS.FAILED]:       { color: "bg-red-400",   label: "Brak połączenia",      animate: false }
};

export default function StatusBar({
  status,
  onlineCount,
  groupName,
  onReconnect
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[WS_STATUS.DISCONNECTED];

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b bg-white">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${config.color} ${
              config.animate ? "animate-pulse" : ""
            }`}
          />
          <span className="text-xs text-slate-500">{config.label}</span>
        </div>

        {status === WS_STATUS.CONNECTED && onlineCount > 0 && (
          <span className="text-xs text-slate-400">
            · {onlineCount} online
          </span>
        )}

        {groupName && (
          <span className="hidden sm:inline text-xs text-slate-400 truncate max-w-[160px]">
            · {groupName}
          </span>
        )}
      </div>

      {(status === WS_STATUS.FAILED || status === WS_STATUS.DISCONNECTED) && (
        <button
          onClick={onReconnect}
          className="text-xs text-teal-600 font-medium hover:underline"
        >
          Połącz ponownie
        </button>
      )}
    </div>
  );
}

