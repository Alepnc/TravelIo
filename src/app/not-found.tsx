import { Compass } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Container, EmptyState } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <Container className="max-w-xl py-20">
      <EmptyState
        icon={<Compass className="h-6 w-6" />}
        title="Questa pagina si è persa per strada"
        description="Il link potrebbe essere sbagliato, oppure il viaggio è stato eliminato o non è tuo."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <LinkButton href="/">Torna alla home</LinkButton>
            <LinkButton href="/viaggi" variant="outline">
              I miei viaggi
            </LinkButton>
          </div>
        }
      />
    </Container>
  );
}
