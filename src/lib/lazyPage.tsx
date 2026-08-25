import { Suspense, lazy, type ComponentType } from "react";
import { RouteFallback } from "@/components/ui/RouteFallback";

export function lazyPage(loader: () => Promise<Record<string, unknown>>, exportName: string) {
  const Lazy = lazy(() =>
    loader().then((m) => ({ default: m[exportName] as ComponentType<object> })),
  );
  return function LazyPage() {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Lazy />
      </Suspense>
    );
  };
}
