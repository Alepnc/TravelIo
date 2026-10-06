"use client";

import { useState } from "react";
import { ArrowSquareOut as ExternalLink } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { BookingSheet } from "./booking-sheet";

/** "Prenota" per un volo o un alloggio già salvato nel viaggio. */
export function TripBookButton({ tripId, kind, itemId, title }: { tripId: string; kind: "flight" | "stay"; itemId: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} icon={<ExternalLink className="h-3.5 w-3.5" />}>
        Prenota
      </Button>
      <BookingSheet open={open} onClose={() => setOpen(false)} title={title} request={{ url: `/api/trips/${tripId}/booking`, body: { kind, itemId } }} />
    </>
  );
}
