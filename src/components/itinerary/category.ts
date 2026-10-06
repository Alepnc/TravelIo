import type { ActivityCategory } from "@/lib/types";

export const CATEGORY_META: Record<ActivityCategory, { label: string; emoji: string; color: string }> = {
  attrazione: { label: "Attrazione", emoji: "🏛️", color: "#0e0f11" },
  museo: { label: "Museo", emoji: "🖼️", color: "#0e0f11" },
  ristorante: { label: "Cibo", emoji: "🍽️", color: "#0e0f11" },
  natura: { label: "Natura", emoji: "🌿", color: "#0e0f11" },
  nightlife: { label: "Serata", emoji: "🍸", color: "#0e0f11" },
  shopping: { label: "Shopping", emoji: "🛍️", color: "#0e0f11" },
  trasporto: { label: "Trasferimento", emoji: "🚕", color: "#0e0f11" },
  alloggio: { label: "Alloggio", emoji: "🏨", color: "#0e0f11" },
  volo: { label: "Volo", emoji: "✈️", color: "#0e0f11" },
  esperienza: { label: "Esperienza", emoji: "✨", color: "#0e0f11" },
  altro: { label: "Altro", emoji: "📍", color: "#0e0f11" },
};

/** Toni per giorno nella vista mappa "tutti i giorni": solo scala d'acciaio: l'ambra resta per il giorno attivo, il rosso per gli allarmi */
export const DAY_COLORS = ["#0e0f11", "#5a5e66", "#9a9ea5", "#383b41", "#7d8188", "#c4c7cb", "#2a2d31", "#a7aaaf"];

export const EDITABLE_CATEGORIES: ActivityCategory[] = ["attrazione", "museo", "ristorante", "natura", "nightlife", "shopping", "esperienza", "trasporto", "alloggio", "altro"];
