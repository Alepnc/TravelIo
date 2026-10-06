import { Plus } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { listTrips } from "@/server/services/trips";
import { diffDays, todayISO } from "@/lib/time";
import { LinkButton } from "@/components/ui/button";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { NotificationsMenu, UserMenu, type AppNotification } from "./user-menu";

const GUEST_LINKS = [
  { href: "/cerca", label: "Esplora" },
  { href: "/viaggi", label: "Viaggi" },
  { href: "/ispirazione", label: "Ispirazione" },
  { href: "/prezzi", label: "Prezzi" },
];
const USER_LINKS = [
  { href: "/cerca", label: "Esplora" },
  { href: "/viaggi", label: "I miei viaggi" },
  { href: "/ispirazione", label: "Ispirazione" },
];

function notificationsFor(userId: string): AppNotification[] {
  const today = todayISO();
  return listTrips(userId).flatMap((t) => {
    const until = diffDays(today, t.startDate);
    if (until < 0 || until > 30 || t.status === "completato") return [];
    return [
      {
        id: t.id,
        title: until === 0 ? `${t.name} inizia oggi!` : `Mancano ${until} giorni a ${t.destinationName}`,
        description: t.status === "pianificazione" ? "Controlla voli, alloggio e itinerario." : "Dai un'occhiata all'itinerario.",
        href: `/viaggi/${t.id}`,
      },
    ];
  });
}

export async function Navbar() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <NavLinks links={user ? USER_LINKS : GUEST_LINKS} />
        </div>
        <div className="flex items-center gap-1.5">
          {user ? (
            <>
              <LinkButton href="/viaggi/nuovo" variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} className="mr-1 hidden sm:inline-flex">
                Crea viaggio
              </LinkButton>
              <NotificationsMenu items={notificationsFor(user.id)} />
              <UserMenu name={user.name} />
            </>
          ) : (
            <>
              <LinkButton href="/accedi" variant="ghost" size="sm">
                Accedi
              </LinkButton>
              <LinkButton href="/viaggi/nuovo" variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} className="hidden sm:inline-flex">
                Crea viaggio
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
