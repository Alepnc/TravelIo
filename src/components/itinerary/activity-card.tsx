"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, Footprints, GripVertical, Lock, MapPin, Pencil, TramFront, Car, Trash2 } from "lucide-react";
import type { ItineraryActivity } from "@/lib/types";
import { cn, formatPrice } from "@/lib/format";
import { formatDuration, fromMinutes, toMinutes } from "@/lib/time";
import { CATEGORY_META } from "./category";

export function TravelChip({ minutes }: { minutes: number }) {
  if (!minutes) return null;
  const Icon = minutes <= 20 ? Footprints : minutes <= 60 ? TramFront : Car;
  return (
    <div className="flex items-center gap-2 py-1 pl-[3.25rem] text-xs font-medium text-muted" aria-label={`${minutes} minuti di spostamento`}>
      <span className="h-4 w-px bg-line" aria-hidden />
      <Icon className="h-3.5 w-3.5" /> {formatDuration(minutes)}
    </div>
  );
}

export function FreeTimeChip({ minutes }: { minutes: number }) {
  if (minutes < 75) return null;
  return <div className="my-1 ml-[3.25rem] rounded-lg border border-dashed border-line px-3 py-1.5 text-xs text-muted">☕ {formatDuration(Math.round(minutes / 5) * 5)} liberi</div>;
}

interface CardProps {
  activity: ItineraryActivity;
  index: number;
  number: number | null;
  active?: boolean;
  conflict?: boolean;
  busy?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onFocus: () => void;
}

export function SortableActivityCard(props: CardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: props.activity.id, data: { dayId: props.activity.dayId } });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn("relative", isDragging && "z-10 opacity-60")}>
      <ActivityCard {...props} handle={<button ref={setActivatorNodeRef} {...attributes} {...listeners} className="flex h-8 w-6 cursor-grab touch-none items-center justify-center rounded-md text-muted/60 active:cursor-grabbing hoverable:hover:bg-ink/5 hoverable:hover:text-ink" aria-label={`Trascina ${props.activity.title}`}><GripVertical className="h-4 w-4" /></button>} />
    </div>
  );
}

export function ActivityCard({ activity: a, number, active, conflict, busy, onEdit, onDelete, onFocus, handle }: CardProps & { handle?: React.ReactNode }) {
  const meta = CATEGORY_META[a.category];
  const end = fromMinutes(toMinutes(a.startTime) + a.durationMin);
  const fixedType = a.category === "volo";
  return (
    <article
      onClick={onFocus}
      className={cn(
        "group flex gap-2 rounded-2xl border bg-surface p-2.5 pr-3 transition-[border-color,box-shadow,opacity] duration-150",
        active ? "border-brand-400 shadow-[0_0_0_3px_var(--color-brand-100)]" : "border-line hoverable:hover:border-ink/20",
        conflict && "border-danger/50",
        busy && "opacity-60",
      )}
    >
      <div className="flex w-11 shrink-0 flex-col items-center pt-0.5">
        <span className="text-sm font-bold tabular-nums">{a.startTime}</span>
        <span className="text-[11px] tabular-nums text-muted">{end}</span>
        {number != null && (
          <span className="mt-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: meta.color }} aria-label={`Tappa ${number} sulla mappa`}>
            {number}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <span className="text-lg leading-6" aria-hidden>{meta.emoji}</span>
          <h4 className="min-w-0 flex-1 font-semibold leading-6">{a.title}</h4>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {formatDuration(a.durationMin)}
          </span>
          {a.placeName && a.placeName !== a.title && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{a.placeName}</span>
            </span>
          )}
          {a.cost > 0 && <span className="font-semibold text-ink-soft">{formatPrice(a.cost)} a pers.</span>}
          {a.cost === 0 && ["attrazione", "natura", "museo"].includes(a.category) && <span className="font-semibold text-success">Gratis</span>}
          {a.timeLocked && !fixedType && (
            <span className="flex items-center gap-1" title="Orario fissato: non viene spostato dal ricalcolo automatico">
              <Lock className="h-3 w-3" /> fisso
            </span>
          )}
          {a.source === "assistant" && <span className="text-brand-600">✨ AI</span>}
        </div>
        {a.notes && <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{a.notes}</p>}
        {conflict && <p className="mt-1 text-xs font-semibold text-danger">Si sovrappone a un&apos;altra attività: cambia orario o durata.</p>}
      </div>
      <div className="-mr-1 flex shrink-0 items-start">
        {handle}
        {!fixedType && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex h-8 w-6 items-center justify-center rounded-md text-muted/70 hoverable:hover:bg-ink/5 hoverable:hover:text-ink" aria-label={`Modifica ${a.title}`}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex h-8 w-6 items-center justify-center rounded-md text-muted/70 hoverable:hover:bg-danger/10 hoverable:hover:text-danger" aria-label={`Elimina ${a.title}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}
