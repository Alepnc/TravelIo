"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setTripStatusAction } from "@/app/actions/trips";
import { STATUS_META } from "@/lib/dto";
import type { TripStatus } from "@/lib/types";
import { cn } from "@/lib/format";

export function StatusSelect({ tripId, status }: { tripId: string; status: TripStatus }) {
  const [pending, start] = useTransition();
  return (
    <label className={cn("relative inline-flex shrink-0 items-center rounded-full text-xs font-bold", STATUS_META[status].tone, pending && "opacity-60")}>
      <span className="sr-only">Stato del viaggio</span>
      <select
        value={status}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await setTripStatusAction(tripId, e.target.value as TripStatus);
            toast.success(`Stato: ${STATUS_META[e.target.value as TripStatus].label}`);
          })
        }
        className="cursor-pointer appearance-none bg-transparent py-1 pl-2.5 pr-6 text-xs outline-none"
      >
        {(Object.keys(STATUS_META) as TripStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2" aria-hidden>▾</span>
    </label>
  );
}
