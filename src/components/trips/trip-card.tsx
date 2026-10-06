"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, DotsThree as MoreHorizontal, PencilSimple as Pencil, Trash as Trash2, Users, Wallet } from "@phosphor-icons/react/dist/ssr";
import { deleteTripAction, duplicateTripAction } from "@/app/actions/trips";
import { CoverImage } from "@/components/ui/cover-image";
import { STATUS_META, type TripSummary } from "@/lib/dto";
import { cn, formatPrice, pluralize } from "@/lib/format";
import { diffDays, formatDate, formatDateRange, todayISO } from "@/lib/time";
import { FlapStatic, FlapText } from "@/components/ui/flap";

export function TripStatusBadge({ status, className }: { status: TripSummary["status"]; className?: string }) {
  const meta = STATUS_META[status];
  return <span className={cn("col-label inline-flex items-center rounded-xs px-1.5 py-1", meta.tone, className)}>{meta.label}</span>;
}

/** Colore delle lettere di stato sul tabellone: ambra per ciò che richiede azione, attenuato per i viaggi conclusi. */
const STATUS_FLAP: Record<TripSummary["status"], string> = {
  pianificazione: "!text-brand-500",
  confermato: "",
  in_corso: "!text-brand-500",
  completato: "!text-board-dim",
};

export function TripRow({ trip }: { trip: TripSummary }) {
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

  const item = "flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm font-medium text-ink hoverable:hover:bg-ink/[0.06]";
  const [day, month] = formatDate(trip.startDate).split(" ");

  return (
    <li className={cn("group relative border-b border-board-frame/70 transition-opacity last:border-b-0", pending && "opacity-50")}>
      <Link
        href={`/viaggi/${trip.id}`}
        aria-label={`Apri ${trip.name}`}
        className="grid grid-cols-[3.5rem_minmax(0,1fr)_2.5rem] items-center gap-x-4 py-3 pr-1 transition-colors duration-150 hoverable:hover:bg-board-frame/60 sm:grid-cols-[4.5rem_5.5rem_minmax(0,1.6fr)_minmax(0,1fr)_9.5rem_2.5rem] sm:gap-x-5"
      >
        <CoverImage src={trip.imageUrl} alt="" label={trip.destinationName.slice(0, 1)} sizes="72px" className="aspect-square w-full rounded-sm sm:aspect-[4/3]" />
        <span className="hidden sm:block">
          <FlapStatic text={`${day} ${month ?? ""}`} className="text-base" />
          {until > 0 && until <= 60 && trip.status !== "completato" && <span className="mt-1 block text-xs text-brand-500">tra {pluralize(until, "giorno", "giorni")}</span>}
        </span>
        <span className="min-w-0">
          <FlapText text={trip.destinationName} length={12} className="hidden text-base sm:inline-flex" />
          <span className="block truncate text-base font-semibold text-board-text sm:mt-1 sm:text-sm sm:font-medium sm:text-board-dim">{trip.name}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-board-dim sm:hidden">
            {formatDateRange(trip.startDate, trip.endDate)}
            <TripStatusBadge status={trip.status} />
          </span>
        </span>
        <span className="hidden flex-col gap-1 text-sm text-board-dim sm:flex">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" /> {pluralize(trip.travelersCount, "persona", "persone")}
          </span>
          <span className="flex items-center gap-1.5">
            <Wallet className="h-4 w-4" /> {trip.budgetPerPerson ? `${formatPrice(trip.budgetPerPerson)} a testa` : "Nessun budget"}
          </span>
        </span>
        <span className="hidden sm:block">
          <FlapStatic text={STATUS_META[trip.status].label} className="flap-sm text-[0.85rem]" cellClassName={STATUS_FLAP[trip.status]} />
        </span>
        <span aria-hidden />
      </Link>

      <div ref={ref} className="absolute right-1 top-1/2 -translate-y-1/2">
        <button onClick={() => setMenu(!menu)} className="press flex h-10 w-10 items-center justify-center rounded-sm text-board-dim hoverable:hover:bg-white/10 hoverable:hover:text-board-text" aria-label={`Azioni per ${trip.name}`} aria-expanded={menu}>
          <MoreHorizontal className="h-5 w-5" />
        </button>
        {menu && (
          <div role="menu" className="absolute right-0 top-11 z-20 w-52 origin-top-right rounded-md border border-ink/15 bg-surface p-1.5 shadow-[var(--shadow-float)] transition-[opacity,transform] duration-150 starting:scale-95 starting:opacity-0">
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
                className={cn(item, "bg-danger text-white hoverable:hover:bg-danger")}
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
    </li>
  );
}
