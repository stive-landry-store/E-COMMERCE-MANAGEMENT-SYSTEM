import type { Lang } from "@/i18n/translations";

export type BotAttachment = {
  url: string;
  name: string;
  mime: string;
};

export type BotReply = { text: string; links?: { label: string; href: string }[] };

const FAQ: Record<Lang, { keys: string[]; reply: BotReply }[]> = {
  en: [
    {
      keys: ["sell", "vendor", "seller", "vendre", "devenir vendeur"],
      reply: {
        text: "To sell on Stive Landry Store: create an account → go to “Sell on Stive Landry Store” → submit your shop details. An admin approves you, then you can post products and services.",
        links: [{ label: "Open seller page", href: "/sell" }],
      },
    },
    {
      keys: ["service", "netflix", "subscription", "abonnement", "icloud", "capcut"],
      reply: {
        text: "Digital subscriptions (Netflix, CapCut, iCloud, etc.) are in Services. Choose a plan, pay via Mobile Money or at the store, and our team activates your account.",
        links: [{ label: "Browse services", href: "/services" }],
      },
    },
    {
      keys: ["pay", "payment", "mobile money", "orange", "mtn", "momo", "paiement"],
      reply: {
        text: "At checkout you can pay at the store, by card, PayPal, or Mobile Money (Orange / MTN). For Mobile Money, the USSD code opens automatically — you only enter your PIN.",
        links: [{ label: "Shop", href: "/shop" }],
      },
    },
    {
      keys: ["order", "commande", "reserve", "preorder", "stock"],
      reply: {
        text: "Browse the shop, add items to cart, and checkout. You can reserve in-stock items or pre-order when out of stock. Track orders in My account → Orders.",
        links: [{ label: "My account", href: "/account" }],
      },
    },
    {
      keys: ["product", "iphone", "macbook", "ipad", "airpods", "produit", "article"],
      reply: {
        text: "Browse Electronics & Apple in the shop. Use search or filters by category. Open a product page for price, availability, and pickup/reservation options.",
        links: [{ label: "Shop", href: "/shop" }],
      },
    },
    {
      keys: ["verify", "verified", "badge", "vérifi", "confiance"],
      reply: {
        text: "The blue badge means a shop is verified. Sellers earn it after good customer ratings or admin approval. Approval to sell and verification are separate steps.",
      },
    },
    {
      keys: ["vendor", "marketplace", "boutique", "vendeur"],
      reply: {
        text: "Our marketplace lists independent vendor shops. Browse all vendors, filter by shop on the shop page, and visit each vendor’s storefront.",
        links: [{ label: "All vendors", href: "/vendors" }],
      },
    },
    {
      keys: ["contact", "help", "whatsapp", "support", "aide"],
      reply: {
        text: "For personal support, use the green WhatsApp button. You can also visit Contact or write to us from the site.",
        links: [{ label: "Contact", href: "/contact" }],
      },
    },
  ],
  fr: [
    {
      keys: ["sell", "vendor", "seller", "vendre", "devenir vendeur", "vendeur"],
      reply: {
        text: "Pour vendre : créez un compte → « Vendre sur Stive Landry Store » → envoyez votre candidature. Un admin approuve votre boutique, puis vous publiez produits et services.",
        links: [{ label: "Page vendeur", href: "/sell" }],
      },
    },
    {
      keys: ["service", "netflix", "subscription", "abonnement", "icloud", "capcut"],
      reply: {
        text: "Les abonnements digitaux sont dans Services. Choisissez une offre, payez (Mobile Money ou en boutique), notre équipe active votre compte.",
        links: [{ label: "Voir les services", href: "/services" }],
      },
    },
    {
      keys: ["pay", "payment", "mobile money", "orange", "mtn", "momo", "paiement"],
      reply: {
        text: "Au paiement : retrait en magasin, carte, PayPal ou Mobile Money (Orange / MTN). Le code USSD s’ouvre automatiquement — vous saisissez seulement votre code secret.",
        links: [{ label: "Boutique", href: "/shop" }],
      },
    },
    {
      keys: ["order", "commande", "reserve", "preorder", "stock", "réserver"],
      reply: {
        text: "Parcourez la boutique, ajoutez au panier et payez. Réservez un article en stock ou précommandez. Suivez vos commandes dans Mon compte → Commandes.",
        links: [{ label: "Mon compte", href: "/account" }],
      },
    },
    {
      keys: ["product", "iphone", "macbook", "ipad", "airpods", "produit", "article"],
      reply: {
        text: "Parcourez Électronique & Apple dans la boutique. Utilisez la recherche ou les filtres. Sur la fiche produit : prix, disponibilité, retrait ou réservation.",
        links: [{ label: "Boutique", href: "/shop" }],
      },
    },
    {
      keys: ["verify", "verified", "badge", "vérifi", "confiance"],
      reply: {
        text: "Le badge bleu = boutique vérifiée. Les vendeurs l’obtiennent après de bonnes notes clients ou validation admin. Vendre et être vérifié sont deux étapes distinctes.",
      },
    },
    {
      keys: ["marketplace", "boutique", "vendeurs"],
      reply: {
        text: "La marketplace regroupe les boutiques indépendantes. Filtrez par vendeur sur la page Boutique ou visitez chaque vitrine.",
        links: [{ label: "Tous les vendeurs", href: "/vendors" }],
      },
    },
    {
      keys: ["contact", "help", "whatsapp", "support", "aide"],
      reply: {
        text: "Pour une aide personnalisée, utilisez WhatsApp (bouton vert). Vous pouvez aussi nous écrire via Contact.",
        links: [{ label: "Contact", href: "/contact" }],
      },
    },
  ],
};

function attachmentReply(lang: Lang, attachment: BotAttachment, question: string): BotReply | null {
  const isImage = attachment.mime.startsWith("image/");
  const q = question.toLowerCase();

  if (isImage) {
    if (lang === "fr") {
      return {
        text: q
          ? "Merci pour la photo. Je ne peux pas analyser l’image automatiquement, mais décrivez votre question (produit, prix, disponibilité) et notre équipe pourra vous aider via WhatsApp si besoin."
          : "Photo reçue. Décrivez votre question sur ce produit ou le site — par ex. disponibilité, prix, commande — et je vous guide.",
        links: [
          { label: "Boutique", href: "/shop" },
          { label: "Contact", href: "/contact" },
        ],
      };
    }
    return {
      text: q
        ? "Thanks for the photo. I can’t auto-analyze images yet — describe your question (product, price, availability) and our team can help on WhatsApp if needed."
        : "Photo received. Describe your question about this product or the site — e.g. availability, price, ordering — and I’ll guide you.",
      links: [
        { label: "Shop", href: "/shop" },
        { label: "Contact", href: "/contact" },
      ],
    };
  }

  if (lang === "fr") {
    return {
      text: `Fichier « ${attachment.name} » reçu. Pour une analyse détaillée (facture, devis, fiche produit), contactez-nous sur WhatsApp avec le même document.`,
      links: [{ label: "Contact", href: "/contact" }],
    };
  }
  return {
    text: `File “${attachment.name}” received. For detailed review (invoice, quote, product sheet), reach us on WhatsApp with the same document.`,
    links: [{ label: "Contact", href: "/contact" }],
  };
}

export function chatbotReply(question: string, lang: Lang, attachment?: BotAttachment | null): BotReply {
  if (attachment) {
    const attReply = attachmentReply(lang, attachment, question);
    if (attReply) return attReply;
  }

  const q = question.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const list = FAQ[lang];
  for (const item of list) {
    if (item.keys.some((k) => q.includes(k.normalize("NFD").replace(/\p{Diacritic}/gu, "")))) {
      return item.reply;
    }
  }
  return lang === "fr"
    ? {
        text: "Je peux vous aider sur : vendre sur le site, services & abonnements, paiement Mobile Money, commandes, produits, vendeurs vérifiés. Posez une question précise ou envoyez une photo/fichier avec votre question.",
        links: [
          { label: "Vendre", href: "/sell" },
          { label: "Services", href: "/services" },
          { label: "Boutique", href: "/shop" },
        ],
      }
    : {
        text: "I can help with: selling on the site, services & subscriptions, Mobile Money payment, orders, products, verified vendors. Ask a specific question or send a photo/file with your question.",
        links: [
          { label: "Sell", href: "/sell" },
          { label: "Services", href: "/services" },
          { label: "Shop", href: "/shop" },
        ],
      };
}

export function chatbotWelcome(lang: Lang) {
  return lang === "fr"
    ? "Bonjour ! Je suis l’assistant Stive Landry Store. Posez une question ou envoyez une photo/fichier (produit, capture d’écran, document)."
    : "Hi! I’m the Stive Landry Store assistant. Ask a question or send a photo/file (product, screenshot, document).";
}

/** Simulate streaming by yielding text chunks */
export async function* streamBotReply(text: string, chunkMs = 18) {
  const words = text.split(/(\s+)/);
  let buf = "";
  for (const w of words) {
    buf += w;
    yield buf;
    await new Promise((r) => setTimeout(r, chunkMs));
  }
}
