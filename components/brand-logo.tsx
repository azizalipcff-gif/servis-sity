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
      ? "/branding/servis-sity-logo-white.png"
      : "/branding/servis-sity-logo.png";

  return (
    <Image
      src={src}
      alt="Servis Sity Logo"
      width={300}
      height={200}
      priority={priority}
      className={className}
      draggable={false}
    />
  );
}