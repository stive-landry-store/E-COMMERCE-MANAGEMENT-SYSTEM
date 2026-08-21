import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

export function Button({ className, variant = "primary", size = "md", ...props }: Props) {
  return (
    <button
      data-variant={variant}
      className={cn(
        "ui-btn inline-flex items-center justify-center gap-2 font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "rounded-lg px-3 py-1.5 text-xs",
        size === "md" && "rounded-xl px-4 py-2.5 text-sm",
        size === "lg" && "rounded-xl px-6 py-3.5 text-base",
        variant === "primary" && "border border-white/10 bg-white/5 text-white hover:bg-white/10",
        variant === "gold" && "btn-glow border-0 bg-brand-grad text-white hover:brightness-110",
        variant === "secondary" && "border border-white/10 bg-white/10 text-white hover:bg-white/15",
        variant === "ghost" && "bg-transparent text-white/75 hover:bg-white/5 hover:text-white",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-500",
        className,
      )}
      {...props}
    />
  );
}
