"use client";

import Image from "next/image";
import { useState } from "react";
import { DEFAULT_PLACEHOLDER_IMAGES, IMAGE_BLUR_PLACEHOLDER } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SmartImage({
  src,
  alt,
  fallback,
  className,
  imgClassName,
  fill = true,
  sizes = "100vw",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  fallback?: string;
  className?: string;
  imgClassName?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
}) {
  const [errored, setErrored] = useState(false);

  const finalSrc =
    errored || !src ? fallback ?? DEFAULT_PLACEHOLDER_IMAGES.business : src;

  const sharedProps = {
    className: cn("object-cover", imgClassName),
    sizes,
    ...(priority ? { priority: true } : { loading: "lazy" as const }),
    placeholder: "blur" as const,
    blurDataURL: IMAGE_BLUR_PLACEHOLDER,
    onError: () => setErrored(true),
  };

  if (fill) {
    return (
      <div className={cn("relative", className)}>
        <Image src={finalSrc} alt={alt} fill {...sharedProps} />
      </div>
    );
  }

  return <Image src={finalSrc} alt={alt} {...sharedProps} />;
}
