import { AirplaneTilt, Bank, Bed, BowlFood, ForkKnife, FrameCorners, MapPin, Martini, Receipt, ShoppingBag, Sparkle, Taxi, Ticket, Train, Tree } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { ActivityCategory, ExpenseCategory } from "@/lib/types";

/** Icone disegnate al posto delle emoji del catalogo: stesso tratto ovunque. */
export const ACTIVITY_ICON: Record<ActivityCategory, Icon> = {
  attrazione: Bank,
  museo: FrameCorners,
  ristorante: ForkKnife,
  natura: Tree,
  nightlife: Martini,
  shopping: ShoppingBag,
  trasporto: Taxi,
  alloggio: Bed,
  volo: AirplaneTilt,
  esperienza: Sparkle,
  altro: MapPin,
};

export const EXPENSE_ICON: Record<ExpenseCategory, Icon> = {
  voli: AirplaneTilt,
  alloggio: Bed,
  trasporti: Train,
  attivita: Ticket,
  cibo: BowlFood,
  altro: Receipt,
};
