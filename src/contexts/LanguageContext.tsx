import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Lang, type TranslationKey } from "@/i18n/translations";

const STORAGE_KEY = "ecms-lang";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "fr") return stored;
  } catch {
    /* ignore */
  }
  const browser = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "en";
  return browser.startsWith("fr") ? "fr" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang());

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang: setLangState,
      t: (key) => translations[lang][key] ?? translations.en[key] ?? key,
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
