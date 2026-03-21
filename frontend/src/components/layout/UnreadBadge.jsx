import { useTranslation } from "react-i18next";
import useBootstrapStore from "../../store/bootstrapStore";

export default function UnreadBadge() {
  const { t } = useTranslation("common");
  const count = useBootstrapStore((s) => s.unreadCount);

  if (count === 0) return null;

  return (
    <span
      className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
      aria-label={t("unreadCount", { count })}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
