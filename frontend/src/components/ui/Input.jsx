import clsx from "clsx";
import { forwardRef } from "react";

const Input = forwardRef(
  ({ label, error, hint, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-slate-700">{label}</label>
        )}
        <input
          ref={ref}
          className={clsx(
            "w-full border rounded-xl px-4 py-2.5 text-slate-800",
            "placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-zebra-500",
            "transition",
            error ? "border-red-300 focus:ring-red-400" : "border-slate-200",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
