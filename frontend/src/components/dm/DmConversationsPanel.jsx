import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import Avatar from "../ui/Avatar";
import { useTranslation } from "react-i18next";

function timeAgo(date, lang) {
  if (!date) return "";
  const locale = lang === "en" ? "en-US" : "pl-PL";
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return lang === "en" ? "now" : "teraz";
  if (diff < 3600) return `${Math.floor(diff / 60)} ${lang === "en" ? "min" : "min"}`;
  if (diff < 86400)
    return `${Math.floor(diff / 3600)} ${lang === "en" ? "h" : "godz."}`;
  return new Date(date).toLocaleDateString(locale);
}

function ConversationRow({ conv, active, lang, noMessagesLabel }) {
  const activeCls = active
    ? "bg-zebra-50 dark:bg-teal-900/30 border border-zebra-100/70 dark:border-teal-800/60"
    : "bg-[var(--zp-app-card)] hover:bg-[var(--zp-app-accent-bg)] dark:hover:bg-teal-900/20 border border-[var(--zp-app-border)]";

  return (
    <Link
      to={`/messages/${conv.id}`}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition ${activeCls}`}
      aria-current={active ? "page" : undefined}
    >
      <div className="shrink-0">
        <Avatar name={conv.other_user_nick} size="md" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {conv.other_user_nick}
          </p>
          <p className="text-[11px] text-[var(--zp-app-text-muted)] shrink-0">
            {timeAgo(conv.last_message_at, lang)}
          </p>
        </div>
        <p className="text-xs text-[var(--zp-app-text-muted)] truncate mt-0.5">
          {conv.last_message_text || noMessagesLabel}
        </p>
      </div>
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl animate-pulse">
      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
      <div className="flex-1">
        <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mt-2" />
      </div>
    </div>
  );
}

export default function DmConversationsPanel({
  conversations,
  activeConversationId,
  loading,
  onOpenSearch,
  showSearchButton,
  title,
  subtitle,
  className = "",
}) {
  const { t, i18n } = useTranslation("app");
  const lang = i18n.language;
  const resolvedTitle = title ?? t("messages.title");
  const resolvedSubtitle =
    subtitle === undefined ? t("messages.subtitle") : subtitle;

  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      String(c.other_user_nick || "").toLowerCase().includes(q)
    );
  }, [conversations, filter]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {resolvedTitle}
          </p>
          {resolvedSubtitle && (
            <p className="text-xs text-[var(--zp-app-text-muted)] mt-0.5">
              {resolvedSubtitle}
            </p>
          )}
        </div>
        {showSearchButton && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-10 h-10 rounded-2xl border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:shadow-sm transition"
            aria-label={t("dm.search")}
          >
            <Search className="w-5 h-5" aria-hidden />
          </button>
        )}
      </div>

      {!showSearchButton && (
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] px-4 py-3 mb-3">
          <Search className="w-5 h-5 text-[var(--zp-app-text-muted)]" aria-hidden />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
              placeholder={t("dm.search")}
            className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-[var(--zp-app-text-muted)]"
          />
        </div>
      )}

      <div className="space-y-1">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] p-5 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("messages.noMessages")}
            </p>
            <p className="text-xs text-[var(--zp-app-text-muted)] mt-1">
              {t("messages.searchToStart")}
            </p>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationRow
              key={conv.id}
              conv={conv}
              active={conv.id === activeConversationId}
              lang={lang}
              noMessagesLabel={t("messages.noMessages")}
            />
          ))
        )}
      </div>
    </div>
  );
}

