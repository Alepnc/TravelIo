import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { CircleNotch as Loader2 } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "sun";
type Size = "sm" | "md" | "lg" | "icon";

// primary: la palette nera del tabellone. secondary/sun: l'ambra, riservata all'azione che conta.
const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-board-text hoverable:hover:bg-board-frame",
  secondary: "bg-brand-500 text-ink hoverable:hover:bg-brand-300",
  sun: "bg-brand-500 text-ink hoverable:hover:bg-brand-300",
  outline: "border border-ink/25 bg-surface text-ink hoverable:hover:border-ink",
  ghost: "text-ink-soft hoverable:hover:bg-ink/[0.06] hoverable:hover:text-ink",
  danger: "border border-danger/30 bg-surface text-danger hoverable:hover:bg-danger/[0.06]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-md",
  md: "h-11 px-4.5 text-sm gap-2 rounded-md",
  lg: "h-13 px-6 text-base gap-2 rounded-md",
  icon: "h-10 w-10 rounded-md",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "press inline-flex shrink-0 items-center justify-center font-semibold tracking-[0.01em] whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,transform] duration-150 disabled:opacity-45 disabled:pointer-events-none",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode };

export function Button({ variant, size, loading, icon, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: ReactNode };

export function LinkButton({ variant, size, icon, className, children, ...props }: LinkButtonProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
