import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Paperclip, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { uploadChatFile } from "@/lib/upload";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import type { SellerMessage } from "@/types";

type VendorPeer = {
  seller_id: string;
  profile_id: string;
  shop_name: string;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
};

function peerMatches(peer: VendorPeer, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    peer.shop_name.toLowerCase().includes(needle) ||
    peer.full_name.toLowerCase().includes(needle) ||
    (peer.email ?? "").toLowerCase().includes(needle)
  );
}

function peerStartsWith(peer: VendorPeer, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    peer.shop_name.toLowerCase().startsWith(needle) ||
    peer.full_name.toLowerCase().startsWith(needle) ||
    (peer.email ?? "").toLowerCase().startsWith(needle)
  );
}

async function fetchSellerPeers(): Promise<VendorPeer[]> {
  const { data, error } = await supabase.rpc("list_seller_chat_peers");
  if (!error && data) {
    return (data as VendorPeer[]).map((row) => ({
      seller_id: row.seller_id,
      profile_id: row.profile_id,
      shop_name: row.shop_name,
      email: row.email ?? null,
      full_name: row.full_name ?? row.shop_name,
      avatar_url: row.avatar_url ?? null,
    }));
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from("sellers")
    .select("id, profile_id, shop_name, profiles!profile_id(full_name, email, avatar_url)")
    .eq("status", "approved")
    .order("shop_name");
  if (fallbackError) throw fallbackError;

  return (fallback ?? [])
    .filter((s) => s.profile_id)
    .map((s) => {
      const prof = s.profiles as { full_name?: string; email?: string | null; avatar_url?: string | null } | null;
      return {
        seller_id: s.id as string,
        profile_id: s.profile_id as string,
        shop_name: s.shop_name as string,
        email: prof?.email ?? null,
        full_name: prof?.full_name ?? (s.shop_name as string),
        avatar_url: prof?.avatar_url ?? null,
      };
    });
}

function VendorAvatarLink({
  peer,
  size = "sm",
}: {
  peer: Pick<VendorPeer, "seller_id" | "shop_name" | "full_name" | "email" | "avatar_url">;
  size?: "sm" | "md";
}) {
  const avatar = (
    <ProfileAvatar
      profile={{ full_name: peer.full_name, email: peer.email, avatar_url: peer.avatar_url }}
      size={size}
    />
  );
  if (!peer.seller_id) return avatar;
  return (
    <Link
      to={`/vendor/${peer.seller_id}`}
      onClick={(e) => e.stopPropagation()}
      title={peer.shop_name}
      className="shrink-0 rounded-full transition hover:ring-2 hover:ring-[#ff2d95]/50"
      aria-label={peer.shop_name}
    >
      {avatar}
    </Link>
  );
}

export function SellerChatPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [peerId, setPeerId] = useState<string | null>(null);
  const [contactQuery, setContactQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const peers = useQuery({
    queryKey: ["seller-chat-peers", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const rows = await fetchSellerPeers();
      return rows.filter((p) => p.profile_id !== user!.id);
    },
  });

  useEffect(() => {
    if (peers.isError) {
      toast.error(peers.error instanceof Error ? peers.error.message : t("sellersLoadError"));
    }
  }, [peers.isError, peers.error, t]);

  const suggestions = useMemo(() => {
    const q = contactQuery.trim();
    const all = peers.data ?? [];
    if (!q) return all.slice(0, 8);
    const starts = all.filter((p) => peerStartsWith(p, q));
    if (starts.length) return starts.slice(0, 8);
    return all.filter((p) => peerMatches(p, q)).slice(0, 8);
  }, [peers.data, contactQuery]);

  const filteredPeers = useMemo(() => {
    const q = contactQuery.trim();
    if (!q) return peers.data ?? [];
    return (peers.data ?? []).filter((p) => peerMatches(p, q));
  }, [peers.data, contactQuery]);

  const messages = useQuery({
    queryKey: ["seller-chat", user?.id, peerId],
    enabled: Boolean(user && peerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user!.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user!.id})`,
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as SellerMessage[];
    },
    refetchInterval: 8000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data, peerId]);

  useEffect(() => {
    if (!user || !peerId) return;
    const channel = supabase
      .channel(`seller-chat-${user.id}-${peerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "seller_messages" },
        () => qc.invalidateQueries({ queryKey: ["seller-chat", user.id, peerId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, peerId, qc]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function sendMessage(body: string, attachment?: { url: string; name: string; mime: string }) {
    if (!user || !peerId) return;
    if (!body.trim() && !attachment) return;
    const { error } = await supabase.from("seller_messages").insert({
      sender_id: user.id,
      recipient_id: peerId,
      body: body.trim() || null,
      attachment_url: attachment?.url ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_mime: attachment?.mime ?? null,
    });
    if (error) toast.error(error.message);
    else {
      setText("");
      qc.invalidateQueries({ queryKey: ["seller-chat", user.id, peerId] });
    }
  }

  async function onFile(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const att = await uploadChatFile(file, user.id);
      await sendMessage(text, att);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  function startChatWith(peer: VendorPeer) {
    setPeerId(peer.profile_id);
    setContactQuery("");
    setShowSuggestions(false);
  }

  function contactBySearch() {
    const q = contactQuery.trim();
    if (!q) return toast.error(t("sellerChatSearchRequired"));
    if (filteredPeers.length === 1) {
      startChatWith(filteredPeers[0]!);
      return;
    }
    if (filteredPeers.length > 1) {
      toast.info(t("sellerChatMultipleMatches"));
      setShowSuggestions(true);
      return;
    }
    toast.error(t("sellerChatNotFound"));
  }

  const activePeer = peers.data?.find((p) => p.profile_id === peerId);

  return (
    <div>
      <h1 className="font-display text-3xl">{t("sellerChat")}</h1>
      <p className="mt-1 mb-6 text-sm text-ink-700/70">{t("sellerChatHint")}</p>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="surface overflow-hidden">
          <p className="border-b border-black/5 px-4 py-3 text-sm font-bold">{t("sellerChatFindVendor")}</p>
          <div className="space-y-2 border-b border-black/5 p-3">
            <div className="relative" ref={searchWrapRef}>
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-700/40" />
              <input
                value={contactQuery}
                onChange={(e) => {
                  setContactQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (suggestions.length === 1) startChatWith(suggestions[0]!);
                    else contactBySearch();
                  }
                }}
                placeholder={t("sellerChatSearchPlaceholder")}
                className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 ? (
                <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-black/10 bg-white py-1 shadow-lg">
                  {suggestions.map((p) => (
                    <li key={p.profile_id}>
                      <div className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[#ff2d95]/10">
                        <VendorAvatarLink peer={p} />
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => startChatWith(p)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate font-semibold">{p.shop_name}</span>
                          <span className="block truncate text-xs text-ink-700/60">
                            {p.full_name}
                            {p.email ? ` · ${p.email}` : ""}
                          </span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <p className="mt-1 text-[10px] text-ink-700/50">{t("sellerChatSearchHint")}</p>
            <Button type="button" variant="gold" className="w-full" onClick={() => contactBySearch()}>
              {t("sellerChatStartContact")}
            </Button>
          </div>
          <p className="border-b border-black/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
            {t("sellerChatPeers")} ({filteredPeers.length})
          </p>
          {peers.isLoading ? (
            <Spinner />
          ) : filteredPeers.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-ink-700/55">{t("sellerChatNoMatch")}</p>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto">
              {filteredPeers.map((p) => (
                <li key={p.profile_id}>
                  <div
                    className={`flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-black/[0.03] ${
                      peerId === p.profile_id ? "bg-[#ff2d95]/10" : ""
                    }`}
                  >
                    <VendorAvatarLink peer={p} />
                    <button type="button" onClick={() => startChatWith(p)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate font-semibold">{p.shop_name}</span>
                      <span className="block truncate text-xs text-ink-700/60">
                        {p.full_name}
                        {p.email ? ` · ${p.email}` : ""}
                      </span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface flex min-h-[420px] flex-col">
          {!peerId ? (
            <p className="m-auto px-6 text-center text-sm text-ink-700/60">{t("sellerChatPickPeer")}</p>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
                {activePeer ? <VendorAvatarLink peer={activePeer} size="md" /> : null}
                <div className="min-w-0 flex-1">
                  {activePeer ? (
                    <Link
                      to={`/vendor/${activePeer.seller_id}`}
                      className="block truncate font-bold hover:gradient-text"
                    >
                      {activePeer.shop_name}
                    </Link>
                  ) : (
                    <p className="truncate font-bold">…</p>
                  )}
                  <p className="truncate text-xs text-ink-700/60">{activePeer?.full_name}</p>
                  <p className="truncate text-xs text-ink-700/50">{activePeer?.email}</p>
                </div>
                {activePeer ? (
                  <Link
                    to={`/vendor/${activePeer.seller_id}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold gradient-text hover:bg-black/[0.04]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("viewShopProfile")}
                  </Link>
                ) : null}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {messages.isLoading ? <Spinner /> : null}
                {(messages.data ?? []).map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          mine ? "bg-brand-grad text-white" : "bg-black/[0.06] text-ink-950"
                        }`}
                      >
                        {m.body ? <p>{m.body}</p> : null}
                        {m.attachment_url ? (
                          m.attachment_mime?.startsWith("image/") ? (
                            <a href={m.attachment_url} target="_blank" rel="noreferrer">
                              <img src={m.attachment_url} alt="" className="mt-1 max-h-40 rounded-lg" />
                            </a>
                          ) : (
                            <a href={m.attachment_url} target="_blank" rel="noreferrer" className="mt-1 block underline">
                              {m.attachment_name ?? t("downloadFile")}
                            </a>
                          )
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form
                className="flex gap-2 border-t border-black/5 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage(text);
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])}
                />
                <Button type="button" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t("sellerChatPlaceholder")}
                  className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
                />
                <Button type="submit" variant="gold" disabled={uploading}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
