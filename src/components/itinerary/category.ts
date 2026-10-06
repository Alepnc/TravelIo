import type { ActivityCategory } from "@/lib/types";

export const CATEGORY_META: Record<ActivityCategory, { label: string; emoji: string; color: string }> = {
  attrazione: { label: "Attrazione", emoji: "🏛️", color: "#4352ff" },
  museo: { label: "Museo", emoji: "🖼️", color: "#7c3aed" },
  ristorante: { label: "Cibo", emoji: "🍽️", color: "#f97316" },
  natura: { label: "Natura", emoji: "🌿", color: "#16a34a" },
  nightlife: { label: "Serata", emoji: "🍸", color: "#db2777" },
  shopping: { label: "Shopping", emoji: "🛍️", color: "#0891b2" },
  trasporto: { label: "Trasferimento", emoji: "🚕", color: "#64748b" },
  alloggio: { label: "Alloggio", emoji: "🏨", color: "#0f172a" },
  volo: { label: "Volo", emoji: "✈️", color: "#0f172a" },
  esperienza: { label: "Esperienza", emoji: "✨", color: "#ca8a04" },
  altro: { label: "Altro", emoji: "📍", color: "#475569" },
};

/** Colori per giorno nella vista mappa "tutti i giorni" */
export const DAY_COLORS = ["#4352ff", "#f97316", "#16a34a", "#db2777", "#0891b2", "#ca8a04", "#7c3aed", "#e11d48"];

export const EDITABLE_CATEGORIES: ActivityCategory[] = ["attrazione", "museo", "ristorante", "natura", "nightlife", "shopping", "esperienza", "trasporto", "alloggio", "altro"];
