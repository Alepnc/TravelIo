"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, MoreHorizontal, Pencil, Trash2, Users, Wallet } from "lucide-react";
import { deleteTripAction, duplicateTripAction } from "@/app/actions/trips";
import { CoverImage } from "@/components/ui/cover-image";
import { STATUS_META, type TripSummary } from "@/lib/dto";
import { cn, flagEmoji, formatPrice, pluralize } from "@/lib/format";
import { diffDays, formatDateRange, todayISO } from "@/lib/time";

export function TripStatusBadge({ status, className }: { status: TripSummary["status"]; className?: string }) {
  const meta = STATUS_META[status];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", meta.tone, className)}>{meta.label}</span>;
}

export function TripCard({ trip }: { trip: TripSummary }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const until = diffDays(todayISO(), trip.startDate);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && (setMenu(false), setConfirming(false));
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);

  const item = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hoverable:hover:bg-ink/5";

  return (
    <article className={cn("group relative animate-fade-up overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] transition-opacity", pending && "opacity-50")}>
      <Link href={`/viaggi/${trip.id}`} className="block" aria-label={`Apri ${trip.name}`}>
        <div className="relative aspect-[16/9]">
          <CoverImage src={trip.imageUrl} alt={trip.destinationName} label={trip.destinationName} sizes="(min-width: 1024px) 380px, 100vw" className="absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <TripStatusBadge status={trip.status} className="absolute left-3 top-3" />
          {until > 0 && until <= 60 && trip.status !== "completato" && <span className="absolute bottom-3 left-3 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-bold">tra {pluralize(until, "giorno", "giorni")}</span>}
        </div>
        <div className="p-4 pr-12">
          <h3 className="truncate text-lg font-bold">
            {flagEmoji(trip.countryCode)} {trip.name}
          </h3>
          <p className="text-sm text-muted">{formatDateRange(trip.startDate, trip.endDate)}</p>
          <div className="mt-3 flex gap-4 text-sm text-ink-soft">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted" /> {trip.travelersCount}
            </span>
            <span className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-muted" /> {trip.budgetPerPerson ? `${formatPrice(trip.budgetPerPerson)}/persona` : "Nessun budget"}
            </span>
          </div>
        </div>
      </Link>

      <div ref={ref} className="absolute bottom-3 right-3">
        <button onClick={() => setMenu(!menu)} className="press flex h-9 w-9 items-center justify-center rounded-full hoverable:hover:bg-ink/5" aria-label={`Azioni per ${trip.name}`} aria-expanded={menu}>
          <MoreHorizontal className="h-5 w-5" />
        </button>
        {menu && (
          <div role="menu" className="absolute bottom-11 right-0 z-20 w-52 origin-bottom-right rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-float)] transition-[opacity,transform] duration-150 starting:scale-95 starting:opacity-0">
            <Link role="menuitem" href={`/viaggi/${trip.id}/modifica`} className={item}>
              <Pencil className="h-4 w-4" /> Modifica
            </Link>
            <button
              role="menuitem"
              className={item}
              onClick={() =>
                start(async () => {
                  setMenu(false);
                  const id = await duplicateTripAction(trip.id);
                  toast.success("Viaggio duplicato", { action: { label: "Apri", onClick: () => router.push(`/viaggi/${id}`) } });
                })
              }
            >
              <Copy className="h-4 w-4" /> Duplica
            </button>
            {confirming ? (
              <button
                role="menuitem"
                className={cn(item, "bg-danger/10 text-danger")}
                onClick={() =>
                  start(async () => {
                    setMenu(false);
                    await deleteTripAction(trip.id);
                    toast.success(`"${trip.name}" eliminato`);
                  })
                }
              >
                <Trash2 className="h-4 w-4" /> Conferma eliminazione
              </button>
            ) : (
              <button role="menuitem" className={cn(item, "text-danger")} onClick={() => setConfirming(true)}>
                <Trash2 className="h-4 w-4" /> Elimina
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
