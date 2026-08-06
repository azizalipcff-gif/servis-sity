import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Servis Sity — Business Directory",
    short_name: "Servis Sity",
    description:
      "Servis Sity — connect with local service providers across Moroccan cities.",
    start_url: "/en",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#bf5b32",
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
        src: "/branding/servis-sity-logo.png",
        sizes: "1536x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}