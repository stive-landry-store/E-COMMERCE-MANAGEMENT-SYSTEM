import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/** Shimmering placeholder grid used while lists load. */
export function SkeletonGrid({
  count = 6,
  className,
  itemClassName,
  variant = "block",
}: {
  count?: number;
  className?: string;
  itemClassName?: string;
  variant?: "block" | "product";
}) {
  return (
    <div className={cn("grid gap-4", className)} role="status" aria-busy="true" data-no-reveal>
      {Array.from({ length: count }).map((_, i) =>
        variant === "product" ? (
          <div key={i} className={cn("skeleton-card", itemClassName)} style={{ animationDelay: `${i * 80}ms` }}>
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-3 sm:p-4">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="mt-3 h-5 w-2/5" />
              <Skeleton className="mt-3 h-9 w-full sm:h-11" />
            </div>
          </div>
        ) : (
          <Skeleton key={i} className={cn("rounded-2xl", itemClassName)} />
        ),
      )}
    </div>
  );
}
