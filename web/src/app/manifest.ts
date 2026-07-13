import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Türk Expatlar",
    short_name: "TürkExpatlar",
    description:
      "Almanya'daki Türkçe konuşan expatlar için topluluk platformu",
    start_url: "/akis",
    display: "standalone",
    background_color: "#0f172a",
    // Tasarım token'ı ile eşleşmeli (globals.css --primary)
    theme_color: "#0f766e",
    orientation: "portrait",
    lang: "tr",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["social", "community"],
    shortcuts: [
      {
        name: "Forum",
        short_name: "Forum",
        description: "Forum tartışmaları",
        url: "/forum",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Sohbet",
        short_name: "Sohbet",
        description: "Genel sohbet odaları",
        url: "/sohbet",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Etkinlikler",
        short_name: "Etkinlik",
        description: "Yaklaşan etkinlikler",
        url: "/etkinlikler",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
