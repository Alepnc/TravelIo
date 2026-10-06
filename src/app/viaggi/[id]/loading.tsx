import { Container, Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <Container className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12" aria-busy="true">
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-44" />
        <Skeleton className="h-36" />
      </div>
      <div className="h-80 rounded-md bg-board p-5"><div className="h-8 w-40 skeleton-board" /></div>
    </Container>
  );
}
