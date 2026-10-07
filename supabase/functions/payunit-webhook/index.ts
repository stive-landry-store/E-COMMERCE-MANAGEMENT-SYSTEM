import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse } from "../_shared/payunit.ts";

function transactionIdFromPayload(body: Record<string, unknown>) {
  const data = (body.data ?? body) as Record<string, unknown>;
  return String(data.transaction_id ?? body.transaction_id ?? "").trim();
}

function statusFromPayload(body: Record<string, unknown>) {
  const data = (body.data ?? body) as Record<string, unknown>;
  return String(data.transaction_status ?? body.transaction_status ?? body.status ?? "")
    .trim()
    .toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const transactionId = transactionIdFromPayload(body);
    const status = statusFromPayload(body);
    if (!transactionId) return jsonResponse({ error: "Missing transaction_id" }, 400);
    if (status !== "SUCCESS") {
      return jsonResponse({ ok: true, ignored: status || "not-success" });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const gateway = String(((body.data as Record<string, unknown> | undefined)?.transaction_gateway as string) ?? "");
    const { data, error } = await admin.rpc("apply_payunit_success", {
      p_transaction_id: transactionId,
      p_gateway: gateway || null,
    });
    if (error) throw error;
    return jsonResponse({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error";
    return jsonResponse({ error: message }, 500);
  }
});
