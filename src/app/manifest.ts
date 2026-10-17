import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Assetly — Asset Inventory",
    short_name: "Assetly",
    description:
      "Track office assets, condition, location, custody and history in one secure inventory.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#080b12",
    theme_color: "#080b12",
    orientation: "any",
    lang: "en",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Assets",
        short_name: "Assets",
        description: "Browse the inventory",
        url: "/dashboard/assets",
      },
      {
        name: "Add asset",
        short_name: "Add",
        description: "Create a new asset record",
        url: "/dashboard/assets/new",
      },
      {
        name: "QR labels",
        short_name: "Labels",
        description: "Generate asset labels",
        url: "/dashboard/tags",
      },
    ],
  };
}
