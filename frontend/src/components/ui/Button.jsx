import clsx from "clsx";

const variants = {
  primary:
    "bg-[var(--zp-accent-primary)] hover:opacity-90 text-white",
  secondary:
    "bg-[var(--zp-app-card)] border border-[var(--zp-app-border)] hover:bg-[var(--zp-app-accent-bg)] text-[var(--zp-app-text-primary)]",
  danger: "bg-red-500 hover:bg-red-600 text-white",
  ghost: "hover:bg-[var(--zp-app-accent-bg)] text-[var(--zp-app-text-muted)]",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm rounded-lg h-9",
  md: "h-12 text-[15px] font-semibold rounded-xl",
  lg: "px-7 py-3 text-base rounded-xl h-12",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = "button",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        "font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--zp-accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--zp-app-bg)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
