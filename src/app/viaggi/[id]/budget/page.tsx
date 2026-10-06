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
    <Container className="grid gap-10 pb-28 pt-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-12">
      <div className="min-w-0">
        <BudgetTracker trip={trip} />
      </div>
      <aside className="xl:sticky xl:top-32 xl:self-start">
        <SuggestionList tripId={trip.id} canComparePrices={trip.flights.length > 0 || !!trip.stay} />
      </aside>
    </Container>
  );
}
