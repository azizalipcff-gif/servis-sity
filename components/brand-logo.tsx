import Image from "next/image";

type BrandLogoProps = {
  variant?: "default" | "white";
  className?: string;
  priority?: boolean;
};

export function BrandLogo({
  variant = "default",
  className,
  priority,
}: BrandLogoProps) {
  const src =
    variant === "white"
      ? "/branding/service-city-logo-white.png"
      : "/branding/service-city-logo.png";

  return (
    <Image
      src={src}
      alt="Service City Logo"
      width={300}
      height={200}
      priority={priority}
      className={className}
      draggable={false}
    />
  );
}