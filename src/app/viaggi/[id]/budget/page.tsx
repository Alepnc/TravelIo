import type { Metadata } from "next";
import { BudgetTracker } from "@/components/budget/budget-tracker";
import { SuggestionList } from "@/components/optimizer/suggestions";
import { Container } from "@/components/ui/misc";
import { loadTrip } from "@/server/load-trip";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetPage({ params }: PageProps<"/viaggi/[id]/budget">) {
  const { id } = await params;
  const { trip } = await loadTrip(id);
  return (
    <Container className="grid gap-6 pb-28 pt-6 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        <BudgetTracker trip={trip} />
      </div>
      <aside className="xl:sticky xl:top-32 xl:self-start">
        <SuggestionList tripId={trip.id} canComparePrices={trip.flights.length > 0 || !!trip.stay} />
      </aside>
    </Container>
  );
}
