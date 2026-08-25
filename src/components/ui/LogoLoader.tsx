import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo.webp";

type Size = "sm" | "md" | "lg" | "xl";

const sizeMap: Record<Size, string> = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-40 w-40 sm:h-48 sm:w-48",
};

type LogoLoaderProps = {
  size?: Size;
  label?: string;
  className?: string;
  pulse?: boolean;
};

/** Animated brand logo used for all loading states. */
export function LogoLoader({ size = "md", label, className, pulse = true }: LogoLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-12", className)} role="status" aria-live="polite">
      <div className={cn("logo-loader-wrap", pulse && "logo-loader-pulse")}>
        <span className="logo-loader-glow" aria-hidden />
        <img src={LOGO_SRC} alt="" className={cn("logo-loader-img relative z-[1] object-contain", sizeMap[size])} />
      </div>
      {label ? <p className="animate-pulse text-sm font-medium text-white/55">{label}</p> : null}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}

type SplashProps = {
  exiting?: boolean;
};

/**
 * Launch splash — Lottie-style logo reveal.
 * Logo mark only (no store name / slogan). Brand orange → magenta colors.
 */
export function LogoSplash({ exiting = false }: SplashProps) {
  return (
    <div
      className={cn("logo-splash fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden", exiting && "logo-splash-exit")}
      aria-busy="true"
      aria-label="Loading"
    >
      {/* Expanding reveal rings (Lottie-style) */}
      <span className="logo-reveal-ring logo-reveal-ring-a" aria-hidden />
      <span className="logo-reveal-ring logo-reveal-ring-b" aria-hidden />
      <span className="logo-reveal-ring logo-reveal-ring-c" aria-hidden />

      {/* Soft brand particles */}
      <span className="logo-reveal-particle p1" aria-hidden />
      <span className="logo-reveal-particle p2" aria-hidden />
      <span className="logo-reveal-particle p3" aria-hidden />
      <span className="logo-reveal-particle p4" aria-hidden />
      <span className="logo-reveal-particle p5" aria-hidden />
      <span className="logo-reveal-particle p6" aria-hidden />

      <div className="logo-splash-mark">
        <span className="logo-loader-glow logo-splash-glow" aria-hidden />
        <div className="logo-reveal-shine-wrap">
          <img
            src={LOGO_SRC}
            alt="Stive Landry Store"
            className="logo-splash-img relative z-[1] h-40 w-40 object-contain sm:h-52 sm:w-52"
          />
          <span className="logo-reveal-shine" aria-hidden />
        </div>
      </div>
    </div>
  );
}
