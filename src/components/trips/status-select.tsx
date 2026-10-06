"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { setTripStatusAction } from "@/app/actions/trips";
import { FlapText } from "@/components/ui/flap";
import { STATUS_META } from "@/lib/dto";
import type { TripStatus } from "@/lib/types";
import { cn } from "@/lib/format";

/** Lo stato del viaggio è la colonna "stato" del tabellone: quando cambia, le palette ruotano. */
export function StatusSelect({ tripId, status }: { tripId: string; status: TripStatus }) {
  const [pending, start] = useTransition();
  return (
    <label className={cn("relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm bg-board p-1 pr-2 focus-within:ring-2 focus-within:ring-brand-500", pending && "opacity-60")}>
      <span className="sr-only">Stato del viaggio</span>
      <FlapText text={STATUS_META[status].label} length={14} className="text-[1.15rem]" cellClassName={status === "pianificazione" ? "!text-brand-500" : undefined} />
      <CaretDown className="h-3.5 w-3.5 text-board-dim" weight="bold" aria-hidden />
      <select
        value={status}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await setTripStatusAction(tripId, e.target.value as TripStatus);
            toast.success(`Stato: ${STATUS_META[e.target.value as TripStatus].label}`);
          })
        }
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {(Object.keys(STATUS_META) as TripStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>
    </label>
  );
}
