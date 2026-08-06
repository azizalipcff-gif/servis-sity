import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  rating,
  size = "size-4",
  className,
}: {
  rating: number;
  size?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`${rating} / 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            size,
            i <= Math.round(rating)
              ? "fill-warning text-warning"
              : "fill-muted text-muted",
          )}
        />
      ))}
    </div>
  );
}
