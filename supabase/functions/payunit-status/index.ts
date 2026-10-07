import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPayunitStatus, jsonResponse, payunitConfigured } from "../_shared/payunit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
      },
    });
  }
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    if (!payunitConfigured()) return jsonResponse({ error: "Payunit is not configured" }, 503);

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: "Sign in required" }, 401);

    const body = (await req.json()) as { transactionId?: string };
    const transactionId = body.transactionId?.trim();
    if (!transactionId) return jsonResponse({ error: "Missing transactionId" }, 400);

    const status = await getPayunitStatus(transactionId);
    const paid = (status.data?.transaction_status ?? "").toUpperCase() === "SUCCESS";
    if (paid) {
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      await admin.rpc("apply_payunit_success", {
        p_transaction_id: transactionId,
        p_gateway: status.data?.transaction_gateway ?? null,
      });
    }
    return jsonResponse({
      transactionId,
      transactionStatus: status.data?.transaction_status ?? "PENDING",
      paid,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status error";
    return jsonResponse({ error: message }, 500);
  }
});
