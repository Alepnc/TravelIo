import type { ReactNode } from "react";
import { FlapText } from "@/components/ui/flap";

/** Accesso e registrazione: a sinistra il pannello del tabellone, a destra il modulo sull'atrio. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="bg-board px-4 pb-8 pt-8 text-board-text sm:px-6 lg:flex lg:flex-col lg:justify-between lg:py-14 lg:pl-[max(1.5rem,calc((100vw-76rem)/2+1.5rem))] lg:pr-12">
        <div>
          <h1>
            <FlapText text={title} className="text-[clamp(1.4rem,3.4vw,2.4rem)]" animateOnMount />
          </h1>
          {subtitle && <p className="mt-4 max-w-sm text-board-text/85">{subtitle}</p>}
        </div>
        <p className="mt-10 hidden max-w-xs text-sm text-board-dim lg:block">Cerchi e confronti senza account. L&apos;account serve solo per salvare i viaggi e ritrovarli su ogni dispositivo.</p>
      </div>
      <div className="flex items-start px-4 pb-24 pt-8 sm:px-8 lg:items-center lg:px-16">
        <div className="w-full max-w-md animate-fade-up">
          {children}
          {footer && <div className="mt-6 border-t border-line pt-5 text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
