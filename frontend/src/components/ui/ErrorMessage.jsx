import { useTranslation } from "react-i18next";

export default function ErrorMessage({ message, onRetry }) {
  const { t } = useTranslation("common");
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
      <span className="text-red-500 dark:text-red-400 text-lg">⚠️</span>
      <div className="flex-1">
        <p className="text-red-700 dark:text-red-300 text-sm">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-red-600 dark:text-red-400 font-medium hover:underline mt-1"
          >
            {t("retry")}
          </button>
        )}
      </div>
    </div>
  );
}
