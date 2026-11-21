// Vercel serverless function: the store chatbot, powered by Claude.
// Answers any question (general knowledge included), then links the topic back
// to a Stive Landry Store product or service.
// Needs the ANTHROPIC_API_KEY environment variable on the Vercel project.
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM = `You are the assistant of Stive Landry Store, an electronics store and marketplace in Cameroon (slogan: "QUALITY BEFORE PRICE").

HOW TO ANSWER
1. Answer the user's actual question first, whatever the topic — general knowledge, science, history, sport, maths, advice, tech support, homework, etc. Be accurate, clear and concise (a few short paragraphs at most). If you are not sure, say so.
2. Then finish with ONE short, natural sentence that connects the topic to something Stive Landry Store offers (a product category, a digital subscription, a service, or support). Make the link relevant and friendly, never pushy. If the question is already about the store, just answer it.
3. On the very last line, add exactly one link in this format: [[/path|Label]] — choose the path from the list below. Write the label in the user's language.
4. Always reply in the user's language (French or English). Plain text only: no markdown headings, no tables, no bold.
5. Never invent prices, stock levels or order details. For orders, payments problems or anything personal, send people to WhatsApp support.

ABOUT THE STORE
- Sells: iPhone, Android phones (Samsung, Google Pixel…), MacBook and laptops, iMac / Mac mini / Mac Studio, iPad and tablets, audio (AirPods, headphones, HomePod), Apple Watch and wearables, accessories (chargers, cables, cases…). Devices are tested before sale. Open-box and sealed options on some phones.
- Digital subscriptions with monthly renewal: Netflix, iCloud, CapCut and more — activated quickly.
- How to buy: choose a product, add it to the cart and pay, or reserve it for pickup in store; out-of-stock items can be pre-ordered. Pickup in store or delivery. Orders are tracked in "My orders".
- Payment: Orange Money, MTN Mobile Money, debit/credit card.
- Marketplace: independent vendors can open a shop on the site ("Sell on Stive Landry Store").
- Support: WhatsApp +237 6 58 66 04 87.
- Created by NYAMI TCHOUPE STIVE LANDRY.

LINKS YOU CAN USE
/shop (all products) · /shop?category=iphone · /shop?category=android-phones · /shop?category=laptop-macbook · /shop?category=mac-desktop · /shop?category=ipad · /shop?category=tablets · /shop?category=audio · /shop?category=wearables · /shop?category=accessories · /services (subscriptions: Netflix, iCloud, CapCut) · /vendors · /sell · /account/orders · /contact · /about`;

type ChatMessage = { role: "user" | "assistant"; content: string };

const MAX_MESSAGES = 12;
const MAX_CHARS = 2000;

// Best-effort per-instance rate limit (protects the API key from abuse)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 12;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 503);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (limited(ip)) return json({ error: "rate_limited" }, 429);

  let payload: { messages?: ChatMessage[]; lang?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const history = (payload.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (history.length && history[0].role !== "user") history.shift();
  if (!history.length || history[history.length - 1].role !== "user") return json({ error: "bad_request" }, 400);

  const lang = payload.lang === "en" ? "English" : "French";
  const client = new Anthropic();

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [...history, { role: "system", content: `The site is currently displayed in ${lang}; reply in the user's language.` }],
    });

    if (response.stop_reason === "refusal") return json({ error: "refusal" }, 200);

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // Pull out [[/path|Label]] links
    const links: { label: string; href: string }[] = [];
    const clean = text
      .replace(/\[\[(\/[^\]|]*)\|([^\]]+)\]\]/g, (_, href: string, label: string) => {
        if (links.length < 2) links.push({ href: href.trim(), label: label.trim() });
        return "";
      })
      .trim();

    return json({ text: clean, links });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "rate_limited" }, 429);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "not_configured" }, 503);
    if (error instanceof Anthropic.APIError) return json({ error: "upstream" }, 502);
    return json({ error: "server" }, 500);
  }
}
