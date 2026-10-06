import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-start justify-center px-4 pb-24 pt-10 sm:items-center sm:pt-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-200/50 blur-3xl" />
      </div>
      <div className="w-full max-w-md animate-fade-up">
        <div className="rounded-[1.75rem] border border-line bg-surface p-6 shadow-[var(--shadow-float)] sm:p-8">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}
