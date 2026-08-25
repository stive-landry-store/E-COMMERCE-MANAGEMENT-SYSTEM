import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";

type Size = "xs" | "sm" | "md" | "lg";

const sizeClass: Record<Size, string> = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
};

function initials(name: string | null | undefined, email: string | null | undefined) {
  const base = (name?.trim() || email?.split("@")[0] || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

type Props = {
  profile?: Pick<Profile, "full_name" | "email" | "avatar_url"> | null;
  email?: string | null;
  size?: Size;
  className?: string;
};

export function ProfileAvatar({ profile, email, size = "md", className }: Props) {
  const label = profile?.full_name || profile?.email || email || "User";
  const src = profile?.avatar_url;
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={label}
        className={cn("shrink-0 rounded-full object-cover ring-2 ring-white/10", sizeClass[size], className)}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-grad font-bold text-white ring-2 ring-white/10",
        sizeClass[size],
        className,
      )}
      aria-hidden
    >
      {initials(profile?.full_name, profile?.email ?? email)}
    </span>
  );
}
