import type { Lang } from "@/i18n/translations";

export type ServiceLocaleCopy = {
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  features: string[];
  headline: string;
  body: string;
};

/** Localized catalog copy for flagship digital services (by slug). */
export const serviceCatalog: Record<string, Record<Lang, ServiceLocaleCopy>> = {
  "netflix-premium": {
    en: {
      name: "Netflix Premium",
      subtitle: "Monthly renewal",
      description:
        "Enjoy Netflix Premium (4K Ultra HD, up to 4 screens) through Stive Landry Store. Preferential price on your first month, then the standard monthly rate.",
      badge: "Premium 4K",
      features: ["Premium account", "4K Ultra HD quality", "Up to 4 screens", "Fast activation"],
      headline: "First month at 2,000 FCFA",
      body: "Then 2,500 FCFA / month. Code STIVELANDRY16STORE = −25% on your first recharge.",
    },
    fr: {
      name: "Netflix Premium",
      subtitle: "Réabonnement mensuel",
      description:
        "Profitez de Netflix Premium (4K Ultra HD, jusqu'à 4 écrans) via Stive Landry Store. Premier mois à tarif préférentiel, puis tarif standard.",
      badge: "Premium 4K",
      features: ["Compte Premium", "Qualité 4K Ultra HD", "Jusqu'à 4 écrans", "Activation rapide"],
      headline: "1er mois à 2 000 FCFA",
      body: "Puis 2 500 FCFA / mois. Code STIVELANDRY16STORE = −25% sur ta première recharge.",
    },
  },
  "capcut-pro": {
    en: {
      name: "CapCut Pro",
      subtitle: "Monthly renewal",
      description:
        "Unlock CapCut Pro to edit videos without watermarks, with pro effects and high-quality exports.",
      badge: "Pro",
      features: ["No watermark", "Pro effects", "HD export", "Ideal for creators"],
      headline: "Only 2,500 FCFA / month",
      body: "Pro editing without watermarks. Code STIVELANDRY16STORE = −25% on your first recharge.",
    },
    fr: {
      name: "CapCut Pro",
      subtitle: "Réabonnement mensuel",
      description:
        "Débloquez CapCut Pro pour monter vos vidéos sans filigrane, avec effets pro et exports haute qualité.",
      badge: "Pro",
      features: ["Sans filigrane", "Effets Pro", "Export HD", "Idéal créateurs"],
      headline: "Seulement 2 500 FCFA / mois",
      body: "Montage pro sans filigrane. Code STIVELANDRY16STORE = −25% sur ta première recharge.",
    },
  },
  icloud: {
    en: {
      name: "iCloud",
      subtitle: "For iPhone & Apple",
      description:
        "iCloud renewal to secure your photos, iPhone backups and files — simple monthly plan.",
      badge: "Apple",
      features: ["iPhone backup", "Photos & files", "Sync across devices", "Fixed monthly price"],
      headline: "Only 3,000 FCFA / month",
      body: "Keep your iPhone backup safe. Code STIVELANDRY16STORE = −25% on your first recharge.",
    },
    fr: {
      name: "iCloud",
      subtitle: "Pour iPhone & Apple",
      description:
        "Réabonnement iCloud pour sécuriser vos photos, sauvegardes iPhone et fichiers — simple et mensuel.",
      badge: "Apple",
      features: ["Sauvegarde iPhone", "Photos & fichiers", "Synchronisation", "Prix fixe / mois"],
      headline: "Seulement 3 000 FCFA / mois",
      body: "Sauvegarde iPhone en toute sérénité. Code STIVELANDRY16STORE = −25% sur ta première recharge.",
    },
  },
};

export function localizedService(slug: string | null | undefined, lang: Lang): ServiceLocaleCopy | null {
  if (!slug) return null;
  return serviceCatalog[slug]?.[lang] ?? null;
}
