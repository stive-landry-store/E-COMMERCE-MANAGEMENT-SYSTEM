export type PayunitInitResult = {
  status?: string;
  statusCode?: number;
  message?: string;
  data?: {
    t_id?: string;
    transaction_id?: string;
    transaction_url?: string;
    t_url?: string;
    redirect?: string;
    providers?: unknown[];
  };
};

export function payunitConfigured() {
  return Boolean(
    Deno.env.get("PAYUNIT_API_USER") &&
      Deno.env.get("PAYUNIT_API_PASSWORD") &&
      Deno.env.get("PAYUNIT_API_KEY"),
  );
}

export function payunitHeaders() {
  const user = Deno.env.get("PAYUNIT_API_USER") ?? "";
  const password = Deno.env.get("PAYUNIT_API_PASSWORD") ?? "";
  const apiKey = Deno.env.get("PAYUNIT_API_KEY") ?? "";
  const mode = (Deno.env.get("PAYUNIT_MODE") ?? "test").toLowerCase() === "live" ? "live" : "test";
  const basic = btoa(`${user}:${password}`);
  return {
    "Content-Type": "application/json",
    Authorization: `Basic ${basic}`,
    "x-api-key": apiKey,
    mode,
  };
}

export function payunitBaseUrl() {
  return (Deno.env.get("PAYUNIT_BASE_URL") ?? "https://gateway.payunit.net").replace(/\/$/, "");
}

export function compactTransactionId() {
  const raw = `SLS${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;
  return raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);
}

export async function initializePayunitPayment(input: {
  amount: number;
  transactionId: string;
  returnUrl: string;
  notifyUrl: string;
  description?: string;
}) {
  const res = await fetch(`${payunitBaseUrl()}/api/gateway/initialize`, {
    method: "POST",
    headers: payunitHeaders(),
    body: JSON.stringify({
      total_amount: Math.round(input.amount),
      currency: "XAF",
      transaction_id: input.transactionId,
      return_url: input.returnUrl,
      notify_url: input.notifyUrl,
      payment_country: "CM",
      purchaseRef: input.description ?? "Stive Landry Store",
    }),
  });
  const json = (await res.json()) as PayunitInitResult;
  if (!res.ok || (json.status && json.status !== "SUCCESS")) {
    throw new Error(json.message || `Payunit initialize failed (${res.status})`);
  }
  const url = json.data?.transaction_url || json.data?.redirect;
  if (!url) {
    throw new Error(json.message || "Payunit did not return a checkout URL");
  }
  return { url, transactionId: json.data?.transaction_id ?? input.transactionId, raw: json };
}

export async function getPayunitStatus(transactionId: string) {
  const res = await fetch(
    `${payunitBaseUrl()}/api/gateway/paymentstatus/${encodeURIComponent(transactionId)}`,
    { method: "GET", headers: payunitHeaders() },
  );
  const json = (await res.json()) as {
    status?: string;
    message?: string;
    data?: { transaction_status?: string; transaction_id?: string; transaction_gateway?: string };
  };
  if (!res.ok) {
    throw new Error(json.message || `Payunit status failed (${res.status})`);
  }
  return json;
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
    },
  });
}
