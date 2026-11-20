import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/Button";
import { KineticMarquee } from "@/components/motion/Motion";

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="relative overflow-hidden">
      <div className="container-page flex min-h-[70svh] flex-col items-center justify-center py-16 text-center">
        <div className="nf-digits" aria-hidden>
          <span className="nf-digit">4</span>
          <span className="nf-digit">0</span>
          <span className="nf-digit">4</span>
        </div>
        <h1 className="hero-fade mt-6 text-3xl font-bold sm:text-4xl" style={{ ["--d" as string]: "0.5s" }}>
          {t("notFoundTitle")}
        </h1>
        <p className="hero-fade mt-3 max-w-md text-white/60" style={{ ["--d" as string]: "0.65s" }}>
          {t("notFoundText")}
        </p>
        <div className="hero-fade mt-8 flex flex-wrap justify-center gap-3" style={{ ["--d" as string]: "0.8s" }}>
          <Link to="/">
            <Button variant="gold" size="lg">
              <ArrowLeft className="h-4 w-4" /> {t("backHome")}
            </Button>
          </Link>
          <Link to="/shop">
            <Button variant="secondary" size="lg">
              {t("shop")}
            </Button>
          </Link>
        </div>
      </div>
      <KineticMarquee className="border-y border-white/10" items={["404", t("notFoundTitle"), "404", t("backHome")]} />
    </div>
  );
}
