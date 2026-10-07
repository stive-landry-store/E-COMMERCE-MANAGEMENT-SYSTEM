import { supabase } from "@/lib/supabase";

export async function startPayunitCheckout(input: {
  kind: "product" | "service";
  orderId: string;
}) {
  const { data, error } = await supabase.functions.invoke("payunit-initialize", {
    body: {
      kind: input.kind,
      orderId: input.orderId,
      returnOrigin: window.location.origin,
    },
  });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    let detail = error.message;
    try {
      const parsed = ctx ? ((await ctx.json()) as { error?: string }) : (data as { error?: string } | null);
      if (parsed?.error) detail = parsed.error;
    } catch {
      /* keep message */
    }
    throw new Error(detail || "Payunit unavailable");
  }
  const url = (data as { url?: string; error?: string } | null)?.url;
  if (!url) {
    throw new Error((data as { error?: string } | null)?.error || "Payunit did not return a payment page");
  }
  window.location.assign(url);
}

export async function refreshPayunitStatus(transactionId: string) {
  const { data, error } = await supabase.functions.invoke("payunit-status", {
    body: { transactionId },
  });
  if (error) throw error;
  return data as { transactionStatus?: string; paid?: boolean; error?: string };
}
