/** Lightweight route loading — avoids heavy logo animation on every navigation */
export function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-flare-pink" />
    </div>
  );
}
