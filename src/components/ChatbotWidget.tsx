import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Paperclip, Send, X } from "lucide-react";
import { chatbotReply, chatbotWelcome, streamBotReply, type BotAttachment } from "@/lib/chatbot";
import { uploadChatbotFile } from "@/lib/upload";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Msg = {
  id: string;
  role: "user" | "bot";
  text: string;
  links?: { label: string; href: string }[];
  attachment?: BotAttachment;
  streaming?: boolean;
};

function guestFolder() {
  let id = sessionStorage.getItem("chatbot-guest-id");
  if (!id) {
    id = `guest-${crypto.randomUUID()}`;
    sessionStorage.setItem("chatbot-guest-id", id);
  }
  return id;
}

export function ChatbotWidget({ className }: { className?: string }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamAbort = useRef(false);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ id: "welcome", role: "bot", text: chatbotWelcome(lang) }]);
    }
  }, [open, lang, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, typing]);

  useEffect(() => {
    streamAbort.current = false;
    return () => {
      streamAbort.current = true;
    };
  }, []);

  async function pushBotReply(reply: ReturnType<typeof chatbotReply>) {
    const botId = `${Date.now()}-b`;
    setTyping(true);
    await new Promise((r) => setTimeout(r, 350));
    setTyping(false);
    setMessages((m) => [...m, { id: botId, role: "bot", text: "", links: reply.links, streaming: true }]);

    for await (const partial of streamBotReply(reply.text)) {
      if (streamAbort.current) break;
      setMessages((m) => m.map((msg) => (msg.id === botId ? { ...msg, text: partial } : msg)));
    }
    setMessages((m) => m.map((msg) => (msg.id === botId ? { ...msg, streaming: false } : msg)));
  }

  async function send(text: string, attachment?: BotAttachment) {
    const q = text.trim();
    if (!q && !attachment) return;

    setMessages((m) => [
      ...m,
      {
        id: `${Date.now()}-u`,
        role: "user",
        text: q || (attachment?.name ?? ""),
        attachment,
      },
    ]);
    setInput("");

    const reply = chatbotReply(q, lang, attachment ?? null);
    await pushBotReply(reply);
  }

  async function onFile(file: File) {
    setUploading(true);
    try {
      const folder = user?.id ?? guestFolder();
      const att = await uploadChatbotFile(file, folder);
      const attachment: BotAttachment = { url: att.url, name: att.name, mime: att.mime };
      await send(input, attachment);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full bg-brand-grad text-white shadow-[0_8px_28px_rgba(255,45,149,0.45)] transition hover:scale-105 hover:brightness-110",
          className,
        )}
        aria-label={t("chatbotOpen")}
        title={t("chatbotOpen")}
      >
        <Bot className="h-7 w-7" />
      </button>

      {open ? (
        <div className="fixed bottom-[max(8.5rem,calc(env(safe-area-inset-bottom)+7rem))] right-4 z-[70] flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0a0818]/95 shadow-2xl backdrop-blur-xl sm:right-6">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-grad">
                <Bot className="h-5 w-5 text-white" />
              </span>
              <div>
                <p className="text-sm font-bold">{t("chatbotTitle")}</p>
                <p className="text-[10px] text-white/50">{t("chatbotSubtitle")}</p>
              </div>
            </div>
            <button type="button" className="rounded-lg p-1.5 hover:bg-white/10" onClick={() => setOpen(false)} aria-label={t("close")}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="max-h-72 min-h-48 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user" ? "bg-brand-grad font-medium text-white" : "bg-white/10 text-white/90",
                  )}
                >
                  {m.attachment?.mime.startsWith("image/") ? (
                    <a href={m.attachment.url} target="_blank" rel="noreferrer">
                      <img src={m.attachment.url} alt="" className="mb-1 max-h-32 rounded-lg" />
                    </a>
                  ) : null}
                  {m.attachment && !m.attachment.mime.startsWith("image/") ? (
                    <a href={m.attachment.url} target="_blank" rel="noreferrer" className="mb-1 block text-xs underline">
                      {m.attachment.name}
                    </a>
                  ) : null}
                  {m.text ? <p>{m.text}</p> : null}
                  {m.links?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.links.map((l) => (
                        <Link
                          key={l.href}
                          to={l.href}
                          className="text-xs font-semibold underline opacity-90 hover:opacity-100"
                          onClick={() => setOpen(false)}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {typing ? (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-white/70">{t("chatbotTyping")}</div>
              </div>
            ) : null}
          </div>

          <form
            className="flex gap-2 border-t border-white/10 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])}
            />
            <button
              type="button"
              disabled={uploading}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/80 hover:bg-white/10"
              onClick={() => fileRef.current?.click()}
              aria-label={t("chatbotAttach")}
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chatbotPlaceholder")}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={uploading || typing}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-grad text-white disabled:opacity-50"
              aria-label={t("send")}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
