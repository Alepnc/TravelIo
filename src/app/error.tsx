"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Container, ErrorState } from "@/components/ui/misc";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Container className="max-w-xl py-20">
      <ErrorState
        title="Qualcosa non ha funzionato"
        description="Non è colpa tua: un servizio non ha risposto come previsto. I tuoi viaggi salvati sono al sicuro."
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={reset}>Riprova</Button>
            <LinkButton href="/" variant="outline">
              Home
            </LinkButton>
          </div>
        }
      />
      {error.digest && <p className="mt-4 text-xs text-muted">Codice errore: {error.digest}</p>}
    </Container>
  );
}
