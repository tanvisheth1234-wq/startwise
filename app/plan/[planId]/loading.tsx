// Shown instantly while a plan screen loads, so taps feel immediate on slow phones.
import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-8 w-2/3 rounded-full" />
      <Skeleton className="h-24 w-full rounded-3xl" />
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-16 w-full rounded-3xl" />
      <Skeleton className="h-16 w-full rounded-3xl" />
    </div>
  );
}
