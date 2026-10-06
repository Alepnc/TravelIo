"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function RemoveButton({ url, label }: { url: string; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const res = await fetch(url, { method: "DELETE" });
        setPending(false);
        if (!res.ok) return toast.error("Operazione non riuscita");
        toast.success(`${label} rimosso`);
        router.refresh();
      }}
      className="press flex h-8 w-8 items-center justify-center rounded-full text-muted hoverable:hover:bg-danger/10 hoverable:hover:text-danger disabled:opacity-50"
      aria-label={`Rimuovi ${label.toLowerCase()}`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
