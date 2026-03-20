import clsx from "clsx";

export function Skeleton({ className = "" }) {
  return (
    <div
      className={clsx(
        "animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg",
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export function SkeletonMember() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="w-9 h-9 rounded-full" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx("h-4", i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}
