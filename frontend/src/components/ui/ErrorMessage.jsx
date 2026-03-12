export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <span className="text-red-500 text-lg">⚠️</span>
      <div className="flex-1">
        <p className="text-red-700 text-sm">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-red-600 font-medium hover:underline mt-1"
          >
            Spróbuj ponownie
          </button>
        )}
      </div>
    </div>
  );
}
