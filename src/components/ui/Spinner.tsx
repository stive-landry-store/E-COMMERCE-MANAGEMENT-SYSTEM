import { LogoLoader } from "@/components/ui/LogoLoader";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return <LogoLoader size="md" label={label} />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-current/25 bg-black/[0.04] px-6 py-14 text-center text-current">
      <p className="font-semibold">{title}</p>
      {hint ? <p className="mt-1 text-sm opacity-65">{hint}</p> : null}
    </div>
  );
}
