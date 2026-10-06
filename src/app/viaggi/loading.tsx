import { Container, Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <Container className="pt-14" aria-busy="true">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="mt-4 h-5 w-96 max-w-full" />
      <div className="mt-10 space-y-px rounded-md bg-board p-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <div className="h-12 w-16 skeleton-board" />
            <div className="h-7 w-48 skeleton-board" />
            <div className="ml-auto h-6 w-28 skeleton-board" />
          </div>
        ))}
      </div>
    </Container>
  );
}
