import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-md bg-slate-200/80 dark:bg-slate-800/70",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
