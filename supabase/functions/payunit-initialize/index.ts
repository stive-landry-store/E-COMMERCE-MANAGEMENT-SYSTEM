import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  compactTransactionId,
  initializePayunitPayment,
  jsonResponse,
  payunitConfigured,
} from "../_shared/payunit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey" } });
  }
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    if (!payunitConfigured()) {
      return jsonResponse({ error: "Payunit is not configured yet. Add API secrets in Supabase." }, 503);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Sign in required" }, 401);

    const body = (await req.json()) as {
      kind?: "product" | "service";
      orderId?: string;
      returnOrigin?: string;
    };
    const kind = body.kind === "service" ? "service" : "product";
    const orderId = body.orderId;
    if (!orderId) return jsonResponse({ error: "Missing order" }, 400);

    let amount = 0;
    if (kind === "product") {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total, profile_id, payment_status")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.profile_id !== user.id) return jsonResponse({ error: "Order not found" }, 404);
      if (data.payment_status === "paid") return jsonResponse({ error: "Already paid" }, 409);
      amount = Number(data.total);
    } else {
      const { data, error } = await supabase
        .from("service_orders")
        .select("id, amount, user_id, payment_confirmed_at")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.user_id !== user.id) return jsonResponse({ error: "Order not found" }, 404);
      if (data.payment_confirmed_at) return jsonResponse({ error: "Already paid" }, 409);
      amount = Number(data.amount);
    }
    if (!Number.isFinite(amount) || amount < 1) return jsonResponse({ error: "Invalid amount" }, 400);

    const origin = (body.returnOrigin || Deno.env.get("SITE_URL") || "https://stive-landry-store.vercel.app").replace(/\/$/, "");
    const transactionId = compactTransactionId();
    const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/payunit-webhook`;
    const returnUrl = `${origin}/checkout/payunit?txn=${encodeURIComponent(transactionId)}`;

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    if (kind === "product") {
      await admin.from("orders").update({ payment_reference: transactionId }).eq("id", orderId);
      await admin.from("payments").update({ provider: "payunit", provider_ref: transactionId }).eq("order_id", orderId);
    } else {
      await admin.from("service_orders").update({ payment_reference: transactionId }).eq("id", orderId);
    }

    const started = await initializePayunitPayment({
      amount,
      transactionId,
      returnUrl,
      notifyUrl,
      description: `SLS ${kind} ${orderId.slice(0, 8)}`,
    });

    return jsonResponse({ url: started.url, transactionId: started.transactionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payunit error";
    return jsonResponse({ error: message }, 500);
  }
});
