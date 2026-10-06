import { LinkButton } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { FlapText } from "@/components/ui/flap";

/** La pagina che non esiste è una partenza soppressa: riga rossa sul tabellone, binari alternativi sotto. */
export default function NotFound() {
  return (
    <div className="bg-board text-board-text">
      <Container className="py-16 sm:py-24">
        <h1>
          <FlapText text="Partenza soppressa" className="text-[clamp(1.6rem,5vw,3.4rem)]" cellClassName="!text-[#ff6b6b]" animateOnMount />
        </h1>
        <p className="mt-5 max-w-md text-lg text-board-text/85">Errore 404: questa pagina si è persa per strada. Il link potrebbe essere sbagliato, oppure il viaggio è stato eliminato o non è tuo.</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <LinkButton href="/" variant="secondary">
            Torna alla home
          </LinkButton>
          <LinkButton href="/viaggi" variant="outline" className="border-board-dim/50 bg-transparent text-board-text hoverable:hover:border-board-text">
            I miei viaggi
          </LinkButton>
        </div>
      </Container>
    </div>
  );
}
