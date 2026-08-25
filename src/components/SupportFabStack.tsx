import { Suspense, lazy, useEffect, useState } from "react";
import { WhatsAppSupportButton } from "@/components/WhatsAppSupportButton";
import { APP_READY_EVENT, SPLASH_SESSION_KEY } from "@/components/ui/AppSplash";

const ChatbotWidget = lazy(() =>
  import("@/components/ChatbotWidget").then((m) => ({ default: m.ChatbotWidget })),
);

function useAppReady() {
  const [ready, setReady] = useState(() => {
    if (typeof window === "undefined") return false;
    if (document.documentElement.dataset.appReady === "1") return true;
    try {
      return Boolean(sessionStorage.getItem(SPLASH_SESSION_KEY));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (ready) return;
    const onReady = () => setReady(true);
    window.addEventListener(APP_READY_EVENT, onReady);
    return () => window.removeEventListener(APP_READY_EVENT, onReady);
  }, [ready]);

  return ready;
}

/** WhatsApp + site chatbot stacked bottom-right */
export function SupportFabStack() {
  const ready = useAppReady();
  if (!ready) return null;

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-[60] flex flex-col items-end gap-3 sm:right-6">
      <Suspense fallback={null}>
        <ChatbotWidget />
      </Suspense>
      <WhatsAppSupportButton className="!static !bottom-auto !right-auto" />
    </div>
  );
}
