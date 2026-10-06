import { Backpack, Bank, Buildings, Coins, Fire, Mountains, MusicNotes, Waves } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

/** Un'icona disegnata per ogni categoria: sostituisce le emoji del catalogo. */
export const CATEGORY_ICON: Record<string, Icon> = {
  weekend: Fire,
  mare: Waves,
  avventura: Backpack,
  nightlife: MusicNotes,
  natura: Mountains,
  cultura: Bank,
  citta: Buildings,
  economici: Coins,
};
