"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, Coffee, Footprints, Sparkle, DotsSixVertical as GripVertical, Lock, MapPin, PencilSimple as Pencil, Tram as TramFront, Car, Trash as Trash2 } from "@phosphor-icons/react/dist/ssr";
import type { ItineraryActivity } from "@/lib/types";
import { cn, formatPrice } from "@/lib/format";
import { formatDuration, fromMinutes, toMinutes } from "@/lib/time";
import { ACTIVITY_ICON } from "@/components/ui/category-icons";

export function TravelChip({ minutes }: { minutes: number }) {
  if (!minutes) return null;
  const Icon = minutes <= 20 ? Footprints : minutes <= 60 ? TramFront : Car;
  return (
    <div className="flex items-center gap-2 border-b border-line py-1.5 pl-[4.25rem] text-xs font-medium text-muted" aria-label={`${minutes} minuti di spostamento`}>
      <span className="h-4 w-px bg-ink/30" aria-hidden />
      <Icon className="h-3.5 w-3.5" /> {formatDuration(minutes)}
    </div>
  );
}

export function FreeTimeChip({ minutes }: { minutes: number }) {
  if (minutes < 75) return null;
  return (
    <div className="flex items-center gap-1.5 border-b border-dashed border-ink/25 py-1.5 pl-[4.25rem] text-xs text-muted">
      <Coffee className="h-3.5 w-3.5" /> {formatDuration(Math.round(minutes / 5) * 5)} liberi
    </div>
  );
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
      <ActivityCard {...props} handle={<button ref={setActivatorNodeRef} {...attributes} {...listeners} className="flex h-9 w-7 cursor-grab touch-none items-center justify-center rounded-sm text-muted active:cursor-grabbing hoverable:hover:bg-ink/[0.06] hoverable:hover:text-ink" aria-label={`Trascina ${props.activity.title}`}><GripVertical className="h-4 w-4" /></button>} />
    </div>
  );
}

export function ActivityCard({ activity: a, number, active, conflict, busy, onEdit, onDelete, onFocus, handle }: CardProps & { handle?: React.ReactNode }) {
  const Icon = ACTIVITY_ICON[a.category] ?? ACTIVITY_ICON.altro;
  const end = fromMinutes(toMinutes(a.startTime) + a.durationMin);
  const fixedType = a.category === "volo";
  return (
    <article
      onClick={onFocus}
      className={cn(
        "group flex gap-3 border-b border-line py-3 pl-1 pr-1 transition-[background-color,opacity] duration-150",
        active ? "bg-surface" : "hoverable:hover:bg-surface/60",
        conflict && "bg-danger/[0.06]",
        busy && "opacity-60",
      )}
    >
      <div className="flex w-[3.6rem] shrink-0 flex-col items-start pt-0.5">
        <time className={cn("flap rounded-xs px-1.5 py-0.5 text-[1.05rem] leading-none tracking-[0.02em]", active ? "bg-brand-500 text-ink" : "bg-ink text-board-text")}>{a.startTime}</time>
        <span className="tabular mt-1 pl-1.5 text-[11px] text-muted">{end}</span>
        {number != null && (
          <span className="ml-1.5 mt-1.5 flex h-5 w-5 items-center justify-center rounded-xs border border-ink text-[11px] font-bold" aria-label={`Tappa ${number} sulla mappa`}>
            {number}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <Icon className="mt-1 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
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
          {a.cost === 0 && ["attrazione", "natura", "museo"].includes(a.category) && <span className="font-semibold text-ink">Gratis</span>}
          {a.timeLocked && !fixedType && (
            <span className="flex items-center gap-1" title="Orario fissato: non viene spostato dal ricalcolo automatico">
              <Lock className="h-3 w-3" /> fisso
            </span>
          )}
          {a.source === "assistant" && (
            <span className="flex items-center gap-1 font-semibold text-ink-soft">
              <Sparkle className="h-3 w-3" weight="fill" /> AI
            </span>
          )}
        </div>
        {a.notes && <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{a.notes}</p>}
        {conflict && <p className="mt-1 text-xs font-semibold text-danger">Si sovrappone a un&apos;altra attività: cambia orario o durata.</p>}
      </div>
      <div className="-mr-1 flex shrink-0 items-start">
        {handle}
        {!fixedType && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex h-9 w-7 items-center justify-center rounded-sm text-muted hoverable:hover:bg-ink/[0.06] hoverable:hover:text-ink" aria-label={`Modifica ${a.title}`}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex h-9 w-7 items-center justify-center rounded-sm text-muted hoverable:hover:bg-danger/10 hoverable:hover:text-danger" aria-label={`Elimina ${a.title}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}
