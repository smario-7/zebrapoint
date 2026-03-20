import clsx from "clsx";
import { forwardRef } from "react";

const Input = forwardRef(
  ({ label, error, hint, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[13px] font-semibold text-[var(--zp-app-text-primary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            "w-full h-11 border rounded-[10px] px-3.5 text-[var(--zp-app-text-primary)] bg-[var(--zp-app-input-bg)]",
            "placeholder:text-[var(--zp-app-text-muted)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--zp-accent-primary)] focus:border-[var(--zp-accent-primary)]",
            "transition border-[var(--zp-app-border)]",
            error && "border-red-400 dark:border-red-500 focus:ring-red-400 focus:border-red-400",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--zp-app-text-muted)]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
