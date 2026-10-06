import type { Metadata } from "next";
import { SignOut as LogOut } from "@phosphor-icons/react/dist/ssr";
import { logoutAction } from "@/app/actions/auth";
import { ProfileForm } from "@/components/auth/profile-form";
import { Button } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/misc";
import { requireUser } from "@/server/auth/session";
import { getProfile } from "@/server/services/auth";
import { getSearchOptions } from "@/server/services/options";

export const metadata: Metadata = { title: "Profilo" };

export default async function ProfilePage() {
  const user = await requireUser("/profilo");
  const [profile, options] = await Promise.all([getProfile(user.id), getSearchOptions()]);
  return (
    <Container className="max-w-2xl pb-28 pt-8 sm:pt-12">
      <h1 className="text-[2.5rem] font-bold leading-none [font-stretch:75%] sm:text-6xl">Profilo</h1>
      <p className="mt-1 text-muted">Le tue preferenze rendono itinerari e suggerimenti più adatti a te.</p>
      <Card className="mt-8 p-6">
        <ProfileForm initial={profile} origins={options.origins} />
      </Card>
      <form action={logoutAction} className="mt-6">
        <Button variant="danger" icon={<LogOut className="h-4 w-4" />}>
          Esci dall&apos;account
        </Button>
      </form>
    </Container>
  );
}
