"use client";

import { cn } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = "md",
  online,
  className,
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  online?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };
  const initials = name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  return (
    <div className={cn("relative shrink-0", className)}>
      <span
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full bg-primary/10 font-bold text-primary ring-1 ring-border",
          sizes[size],
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          initials || "?"
        )}
      </span>
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full ring-2 ring-background",
            online ? "bg-emerald-500" : "bg-muted-foreground/50",
          )}
        />
      )}
    </div>
  );
}