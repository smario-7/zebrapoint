import clsx from "clsx";

const COLORS = [
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
];

function getColor(name = "") {
  const idx = name.charCodeAt(0) % COLORS.length;
  return COLORS[idx];
}

export default function Avatar({ name = "", size = "md", className = "" }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizeClasses = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div
      className={clsx(
        "rounded-full flex items-center justify-center font-semibold flex-shrink-0",
        sizeClasses[size],
        getColor(name),
        className
      )}
    >
      {initials || "?"}
    </div>
  );
}
