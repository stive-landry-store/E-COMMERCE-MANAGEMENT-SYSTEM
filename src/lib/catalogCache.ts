import type { QueryClient } from "@tanstack/react-query";

/** Drop cached catalog so the public shop shows the price that was just saved. */
export function invalidateStorefront(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ["shop"] });
  void qc.invalidateQueries({ queryKey: ["product"] });
  void qc.invalidateQueries({ queryKey: ["featured-products"] });
  void qc.invalidateQueries({ queryKey: ["admin-products"] });
  void qc.invalidateQueries({ queryKey: ["admin-product"] });
  void qc.invalidateQueries({ queryKey: ["home-categories"] });
}
