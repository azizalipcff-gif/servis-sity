import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading workspace">
      <header>
        <Skeleton className="h-9 w-2/3 max-w-md rounded-lg sm:h-11" />
        <Skeleton className="mt-3 h-4 w-1/2 max-w-sm rounded-md" />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="mt-3 h-7 w-10 rounded-md" />
            <Skeleton className="mt-2 h-3 w-16 rounded-md" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-60 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  );
}