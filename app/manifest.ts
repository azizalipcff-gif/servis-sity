import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Service City — Business Directory",
    short_name: "Service City",
    description:
      "Service City — connect with local service providers across Moroccan cities.",
    start_url: "/en",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#e07a2d",
    icons: [
      {
        src: "/branding/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/branding/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/branding/service-city-logo.png",
        sizes: "1536x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}