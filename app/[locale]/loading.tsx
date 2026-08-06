import { BrandLogo } from "@/components/brand-logo";

export default function Loading() {
  return (
    <div
      className="container-site py-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="space-y-8">
        <div className="flex justify-center">
          <BrandLogo className="h-10 w-auto animate-pulse" />
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="skeleton h-8 w-32 rounded-full" />
          <div className="skeleton h-8 w-24 rounded-full" />
          <div className="skeleton ms-auto h-10 w-40 rounded-full" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="skeleton h-[340px] rounded-3xl" />
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-32 rounded-2xl" />
              ))}
            </div>
            <div className="skeleton h-48 rounded-3xl" />
          </div>
          <div className="space-y-6">
            <div className="skeleton h-72 rounded-3xl" />
            <div className="skeleton h-40 rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}