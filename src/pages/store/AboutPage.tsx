import { STORE } from "@/lib/constants";

export function AboutPage() {
  return (
    <div className="container-page max-w-3xl py-14">
      <p className="gradient-text font-bold tracking-widest">{STORE.tagline}</p>
      <h1 className="mt-3 text-4xl font-extrabold">A specialist counter for iPhone and electronics.</h1>
      <div className="mt-8 space-y-4 text-white/70">
        <p>
          {STORE.name} helps customers see what is actually on the shelf before they travel. The catalog, stock counts,
          reservations and pre-orders live in one system so sales and inventory stay aligned.
        </p>
        <p>
          We focus on genuine devices, honest availability, and a simple pickup experience. If a model is low, you will
          see it. If it is gone, you can pre-order instead of being promised stock that is not there.
        </p>
        <p>
          Staff record every stock addition, removal and physical count with a reason. That audit trail is how we keep
          online numbers matching the store.
        </p>
      </div>
    </div>
  );
}
