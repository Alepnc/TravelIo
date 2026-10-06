import { Container, Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <Container className="grid gap-6 pt-6 lg:grid-cols-[1fr_360px]" aria-busy="true">
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-44" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-80" />
    </Container>
  );
}
