"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CalendarDots as CalendarDays, CaretDown as ChevronDown, Stack as Layers, List, MapTrifold as MapIcon, Plus, ArrowsClockwise as RefreshCw, Path as Route, MagicWand as Wand2 } from "@phosphor-icons/react/dist/ssr";
import type { Itinerary, ItineraryDay, LatLng, PointOfInterest, TripPace } from "@/lib/types";
import { findConflicts, totalTravel } from "@/lib/itinerary/reflow";
import { mapStops } from "@/lib/itinerary/stops";
import { cn, formatPrice } from "@/lib/format";
import { formatDate, formatDuration, toMinutes } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { LazyTripMap } from "@/components/map/lazy-trip-map";
import type { MapLayer } from "@/components/map/trip-map";
import { AssistantButton, AssistantPanel } from "@/components/assistant/assistant-panel";
import { ActivityCard, FreeTimeChip, SortableActivityCard, TravelChip } from "./activity-card";
import { ActivityEditor } from "./activity-editor";
import { AddActivitySheet } from "./add-activity";
import { DAY_COLORS } from "./category";
import { useItinerary } from "./use-itinerary";

interface Props {
  tripId: string;
  initial: Itinerary | null;
  pois: PointOfInterest[];
  hotel: { name: string; location: LatLng } | null;
  center: LatLng;
  pace: TripPace;
  initialDayIndex: number;
  hasFlights: boolean;
  hasStay: boolean;
}

const PACE_LABEL: Record<TripPace, string> = { rilassato: "Rilassato", bilanciato: "Bilanciato", intenso: "Intenso" };

function Menu({ label, icon, children, align = "right" }: { label: string; icon: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="press flex h-9 items-center gap-1.5 rounded-md border border-ink/20 bg-surface px-3 text-sm font-semibold hoverable:hover:border-ink/50">
        {icon} <span className="hidden sm:inline">{label}</span> <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div role="menu" className={cn("absolute top-11 z-40 w-64 rounded-md border border-ink/15 bg-surface p-1.5 shadow-[var(--shadow-float)] transition-[opacity,transform] duration-150 starting:scale-95 starting:opacity-0", align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left")}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

const menuItem = "flex w-full flex-col items-start rounded-sm px-3 py-2 text-left text-sm hoverable:hover:bg-ink/[0.06]";

function DayPill({ day, active, onClick, color, dragging }: { day: ItineraryDay; active: boolean; onClick: () => void; color: string; dragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day.id}` });
  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex shrink-0 flex-col items-start rounded-xs px-3 py-1.5 text-left transition-[background-color,color,box-shadow] duration-150",
        active ? "bg-board-frame text-board-text shadow-[inset_0_-3px_0_var(--color-brand-500)]" : "bg-board-cell text-board-dim hoverable:hover:text-board-text",
        dragging && !active && "outline outline-1 -outline-offset-1 outline-dashed outline-board-dim",
        isOver && !active && "bg-board-frame text-board-text shadow-[inset_0_0_0_2px_var(--color-brand-500)]",
      )}
    >
      <span className="flap flex items-center gap-1.5 text-sm">
        <span className="h-2 w-2 rounded-full ring-1 ring-board-dim" style={{ background: color }} aria-hidden /> Giorno {day.dayIndex + 1}
      </span>
      <span className="text-xs opacity-80">{formatDate(day.date, { weekday: true })}</span>
    </button>
  );
}

export function ItineraryBuilder({ tripId, initial, pois, hotel, center, pace, initialDayIndex, hasFlights, hasStay }: Props) {
  const { itinerary, busy, generate, regenerateDay, reorder, update, remove, create, replace } = useItinerary(tripId, initial);
  const [dayIndex, setDayIndex] = useState(initialDayIndex);
  const [mobileView, setMobileView] = useState<"lista" | "mappa">("lista");
  const [allDaysOnMap, setAllDaysOnMap] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [genPace, setGenPace] = useState<TripPace>(pace);
  const listRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const days = useMemo(() => itinerary?.days ?? [], [itinerary]);
  const safeIndex = Math.min(dayIndex, Math.max(0, days.length - 1));
  const day = days[safeIndex];
  const activities = useMemo(() => day?.activities ?? [], [day]);
  const { stops, numberOf } = useMemo(() => mapStops(activities), [activities]);
  const conflicts = useMemo(() => findConflicts(activities), [activities]);
  const usedPoiIds = useMemo(() => new Set(days.flatMap((d) => d.activities.map((a) => a.poiId).filter((x): x is string => !!x))), [days]);
  const editing = days.flatMap((d) => d.activities).find((a) => a.id === editingId) ?? null;
  const dragging = activities.find((a) => a.id === draggingId) ?? null;

  const layers: MapLayer[] = useMemo(() => {
    if (!allDaysOnMap) return [{ key: day?.id ?? "x", color: "category", stops }];
    return days.map((d, i) => ({ key: d.id, color: DAY_COLORS[i % DAY_COLORS.length], stops: mapStops(d.activities).stops, dimmed: false }));
  }, [allDaysOnMap, days, day, stops]);

  const dayStats = useMemo(() => {
    const travel = totalTravel(activities.filter((a) => a.category !== "volo" && a.category !== "trasporto"));
    const cost = activities.reduce((s, a) => s + a.cost, 0);
    return { travel, cost, count: activities.filter((a) => a.poiId).length };
  }, [activities]);

  // Clic su un marker: evidenzia e porta in vista la card corrispondente
  function focusActivity(id: string) {
    setActiveId(id);
    setMobileView("lista");
    requestAnimationFrame(() => listRef.current?.querySelector(`[data-activity="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function onDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const activeIdStr = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || !day) return;
    if (overId.startsWith("day:")) {
      const targetId = overId.slice(4);
      if (targetId === day.id) return;
      const target = days.find((d) => d.id === targetId)!;
      const ids = target.activities.map((a) => a.id);
      // Prima di eventuali trasferimenti/voli finali della giornata di destinazione
      const tail = target.activities.findIndex((a) => a.category === "volo" || (a.category === "trasporto" && a.title.includes("aeroporto")));
      ids.splice(tail >= 0 ? tail : ids.length, 0, activeIdStr);
      reorder([
        { dayId: day.id, activityIds: activities.map((a) => a.id).filter((id) => id !== activeIdStr) },
        { dayId: target.id, activityIds: ids },
      ]);
      return;
    }
    if (overId === activeIdStr) return;
    const from = activities.findIndex((a) => a.id === activeIdStr);
    const to = activities.findIndex((a) => a.id === overId);
    if (from < 0 || to < 0) return;
    reorder([{ dayId: day.id, activityIds: arrayMove(activities, from, to).map((a) => a.id) }]);
  }

  // ───────── Nessun itinerario: invito a generarlo ─────────
  if (!itinerary) {
    return (
      <div className="mx-auto max-w-[76rem] px-4 py-12 sm:px-6">
       <div className="max-w-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-ink text-brand-500">
          <Wand2 className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-4xl font-bold leading-none [font-stretch:78%]">Genera il tuo itinerario</h2>
        <p className="mt-3 text-muted">Organizziamo le giornate per zona, con tempi di spostamento, orari di apertura, pranzo e cena. Poi lo modifichi come preferisci.</p>
        {(!hasFlights || !hasStay) && (
          <p className="mt-4 max-w-md rounded-md bg-brand-500 px-4 py-3 text-sm font-medium text-ink">
            {!hasFlights && !hasStay ? "Senza voli e alloggio" : !hasFlights ? "Senza voli" : "Senza alloggio"} useremo orari e posizione standard (centro città). Puoi aggiungerli anche dopo e rigenerare.
          </p>
        )}
        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-semibold">Che ritmo preferisci?</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PACE_LABEL) as TripPace[]).map((p) => (
              <button key={p} onClick={() => setGenPace(p)} aria-pressed={genPace === p} className={cn("press rounded-md border px-3 py-3 text-sm font-semibold transition-colors duration-150", genPace === p ? "border-ink bg-ink text-board-text" : "border-ink/15 bg-surface hoverable:hover:border-ink/50")}>
                {PACE_LABEL[p]}
              </button>
            ))}
          </div>
        </fieldset>
        <Button size="lg" variant="secondary" className="mt-6" loading={busy === "generate"} icon={<Wand2 className="h-5 w-5" />} onClick={() => generate({ pace: genPace })}>
          Genera itinerario
        </Button>
       </div>
      </div>
    );
  }

  const anyModified = days.some((d) => d.isUserModified);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <DndContext id="itinerary-dnd" sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDraggingId(null)}>
        {/* ───────── Colonna lista ───────── */}
        <div className={cn("min-w-0 pb-36 lg:pb-16", mobileView === "mappa" && "hidden lg:block")}>
          <div className="sticky top-[6.55rem] z-20 bg-board">
            <div className="scrollbar-none flex gap-px overflow-x-auto px-4 py-2 sm:px-6" role="tablist" aria-label="Giornate">
              {days.map((d, i) => (
                <DayPill key={d.id} day={d} active={i === safeIndex} color={DAY_COLORS[i % DAY_COLORS.length]} dragging={!!draggingId} onClick={() => setDayIndex(i)} />
              ))}
            </div>
            {draggingId && <p className="px-6 pb-2 text-xs font-semibold text-board-text">Rilascia su un altro giorno per spostare l&apos;attività</p>}
          </div>

          {day && (
            <div className="px-4 pt-5 sm:px-6" ref={listRef}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
                    <CalendarDays className="h-4 w-4" /> {formatDate(day.date, { weekday: true, long: true })}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold leading-tight [font-stretch:80%] sm:text-3xl">
                    Giorno {day.dayIndex + 1} · {day.title}
                  </h2>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted">
                    <span>{dayStats.count} tappe</span>
                    <span className="flex items-center gap-1">
                      <Route className="h-3.5 w-3.5" /> {formatDuration(dayStats.travel)} di spostamenti
                    </span>
                    <span>{formatPrice(dayStats.cost)} a persona</span>
                    {day.isUserModified && <span className="font-semibold text-ink-soft">Modificato da te</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Menu label="Rigenera giorno" icon={<RefreshCw className={cn("h-4 w-4", busy === `day:${day.id}` && "animate-spin")} />}>
                    {(close) => (
                      <>
                        <p className="px-3 pb-1 pt-1.5 text-xs text-muted">Le attività che hai modificato o aggiunto restano al loro posto.</p>
                        {(Object.keys(PACE_LABEL) as TripPace[]).map((p) => (
                          <button key={p} role="menuitem" className={menuItem} onClick={() => { close(); regenerateDay(day.id, p); }}>
                            <span className="font-semibold">{PACE_LABEL[p]}</span>
                            <span className="text-xs text-muted">{p === "rilassato" ? "Giornata tranquilla, meno tappe" : p === "intenso" ? "Più tappe, serata inclusa" : "Il giusto equilibrio"}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </Menu>
                  <Menu label="Itinerario" icon={<Layers className="h-4 w-4" />}>
                    {(close) => (
                      <>
                        <button role="menuitem" className={menuItem} onClick={() => { close(); generate({}); }}>
                          <span className="font-semibold">Rigenera le giornate non modificate</span>
                          <span className="text-xs text-muted">{anyModified ? "Le giornate che hai toccato restano invariate" : "Ricrea l'itinerario con voli e alloggio aggiornati"}</span>
                        </button>
                        {anyModified && (
                          <button role="menuitem" className={cn(menuItem, "text-danger")} onClick={() => { close(); generate({ overwriteUserChanges: true }); }}>
                            <span className="font-semibold">Rigenera tutto da zero</span>
                            <span className="text-xs opacity-80">Le tue modifiche andranno perse</span>
                          </button>
                        )}
                      </>
                    )}
                  </Menu>
                </div>
              </div>

              <div className={cn("mt-5 transition-opacity duration-200", (busy === "generate" || busy === `day:${day.id}`) && "pointer-events-none opacity-50")}>
                {activities.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-ink/25 px-5 py-4 text-sm text-muted">
                    Giornata libera. Aggiungi un&apos;attività o chiedi all&apos;assistente.
                    <Button size="sm" variant="outline" onClick={() => setAdding(true)} icon={<Plus className="h-4 w-4" />}>
                      Aggiungi
                    </Button>
                  </div>
                ) : (
                  <SortableContext items={activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                    <ol className="border-t-2 border-ink">
                      {activities.map((a, i) => {
                        const prev = activities[i - 1];
                        const gap = prev ? toMinutes(a.startTime) - (toMinutes(prev.startTime) + prev.durationMin + (a.travelMinFromPrev ?? 0)) : 0;
                        return (
                          <li key={a.id} data-activity={a.id}>
                            {i > 0 && (gap >= 75 ? <FreeTimeChip minutes={gap} /> : null)}
                            {i > 0 && <TravelChip minutes={a.travelMinFromPrev ?? 0} />}
                            
                            <SortableActivityCard
                              activity={a}
                              index={i}
                              number={numberOf.get(a.id) ?? null}
                              active={activeId === a.id}
                              conflict={conflicts.has(a.id)}
                              busy={busy === `act:${a.id}`}
                              onFocus={() => setActiveId(a.id)}
                              onEdit={() => setEditingId(a.id)}
                              onDelete={() => remove(a)}
                            />
                          </li>
                        );
                      })}
                    </ol>
                  </SortableContext>
                )}
                <button onClick={() => setAdding(true)} className="press mt-4 hidden w-full items-center justify-center gap-2 rounded-md border border-dashed border-ink/25 py-3.5 text-sm font-semibold text-ink-soft hoverable:hover:border-ink hoverable:hover:text-ink lg:flex">
                  <Plus className="h-4 w-4" /> Aggiungi attività
                </button>
                <p className="mt-4 hidden text-xs text-muted lg:block">Trascina le attività per riordinarle o rilasciale su un altro giorno. Da tastiera: Spazio per afferrare, frecce per spostare.</p>
              </div>
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
          {dragging ? (
            <div className="rotate-1 scale-[1.02] shadow-[var(--shadow-float)]">
              <ActivityCard activity={dragging} index={0} number={numberOf.get(dragging.id) ?? null} onEdit={() => {}} onDelete={() => {}} onFocus={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ───────── Colonna mappa ───────── */}
      <div className={cn("relative lg:block", mobileView === "lista" ? "hidden" : "block")}>
        <div className="sticky top-[6.55rem] h-[calc(100dvh-6.55rem-4.5rem)] lg:h-[calc(100dvh-6.55rem)]">
          <LazyTripMap layers={layers} hotel={hotel} center={center} activeIds={new Set(activeId ? [activeId] : [])} onSelect={focusActivity} />
          <div className="absolute left-3 top-3 z-[500] flex gap-px rounded-md bg-board p-1 shadow-[var(--shadow-float)]">
            <button onClick={() => setAllDaysOnMap(false)} aria-pressed={!allDaysOnMap} className={cn("flap rounded-xs px-3 py-1.5 text-xs", !allDaysOnMap ? "bg-brand-500 text-ink" : "bg-board-cell text-board-dim hoverable:hover:text-board-text")}>
              Giorno {safeIndex + 1}
            </button>
            <button onClick={() => setAllDaysOnMap(true)} aria-pressed={allDaysOnMap} className={cn("flap rounded-xs px-3 py-1.5 text-xs", allDaysOnMap ? "bg-brand-500 text-ink" : "bg-board-cell text-board-dim hoverable:hover:text-board-text")}>
              Tutti i giorni
            </button>
          </div>
          {!allDaysOnMap && stops.length > 0 && (
            <ol className="scrollbar-none absolute inset-x-3 bottom-3 z-[500] flex gap-2 overflow-x-auto lg:hidden">
              {stops.map((s) => (
                <li key={s.number}>
                  <button onClick={() => focusActivity(s.activityIds[0])} className="flex shrink-0 items-center gap-2 rounded-md bg-surface px-3 py-2 text-xs font-semibold shadow-[var(--shadow-float)]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-xs bg-ink text-[10px] text-board-text">{s.number}</span>
                    <span className="max-w-36 truncate">{s.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* ───────── Barra azioni ───────── */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-board-frame bg-board px-3 pt-2 lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <div className="grid flex-1 grid-cols-2 gap-px rounded-md bg-board-frame p-px">
            <button onClick={() => setMobileView("lista")} aria-pressed={mobileView === "lista"} className={cn("flex h-10 items-center justify-center gap-1.5 rounded-[3px] text-sm font-semibold", mobileView === "lista" ? "bg-brand-500 text-ink" : "bg-board-cell text-board-dim")}>
              <List className="h-4 w-4" /> Lista
            </button>
            <button onClick={() => setMobileView("mappa")} aria-pressed={mobileView === "mappa"} className={cn("flex h-10 items-center justify-center gap-1.5 rounded-[3px] text-sm font-semibold", mobileView === "mappa" ? "bg-brand-500 text-ink" : "bg-board-cell text-board-dim")}>
              <MapIcon className="h-4 w-4" /> Mappa
            </button>
          </div>
          <button onClick={() => setAdding(true)} className="press flex h-11 w-11 items-center justify-center rounded-md border border-board-frame bg-board-cell text-board-text" aria-label="Aggiungi attività">
            <Plus className="h-5 w-5" />
          </button>
          <AssistantButton onClick={() => setAssistantOpen(true)} className="px-3.5" />
        </div>
      </div>
      <div className="fixed bottom-6 right-6 z-40 hidden lg:block">
        <AssistantButton onClick={() => setAssistantOpen(true)} />
      </div>

      <ActivityEditor
        activity={editing}
        days={days}
        onClose={() => setEditingId(null)}
        onSave={(patch) => {
          setEditingId(null);
          if (Object.keys(patch).length && editing) update(editing.id, patch);
        }}
      />
      <AddActivitySheet
        open={adding}
        onClose={() => setAdding(false)}
        day={day}
        pois={pois}
        usedPoiIds={usedPoiIds}
        onAdd={(draft) => {
          setAdding(false);
          if (day) create(day.id, draft);
        }}
      />
      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} tripId={tripId} focusDayId={day?.id} onItinerary={replace} />
    </div>
  );
}
