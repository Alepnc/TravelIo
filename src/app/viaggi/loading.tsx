import { Container, Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <Container className="pt-12" aria-busy="true">
      <Skeleton className="h-10 w-64" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    </Container>
  );
}
