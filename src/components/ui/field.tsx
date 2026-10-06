import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

export const inputClass =
  "h-11 w-full rounded-md border border-ink/20 bg-surface px-3 text-ink placeholder:text-muted transition-[border-color,box-shadow] duration-150 hoverable:hover:border-ink/40 focus:border-ink focus:outline-none focus:ring-3 focus:ring-brand-500 aria-[invalid=true]:border-danger";

export function Field({ label, error, hint, children, className, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(inputClass, "appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230e0f11' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "h-auto min-h-24 py-2.5", className)} {...props} />;
}
