import type { MetadataRoute } from "next";

/**
 * Web app manifest.
 *
 * Without this, Chrome has nothing to install: it invents a home-screen icon
 * from the favicon and opens the site in a normal browser tab. With it, the
 * app gets its own icon, its own name, and launches without browser chrome.
 *
 * Next serves this at /manifest.webmanifest and links it from every page
 * automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Expense Tracker",
    // Home screens truncate at roughly 12 characters.
    short_name: "Expenses",
    description:
      "Personal expense tracker with credit-card and UPI spending in one place.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#EEF3F8",
    theme_color: "#EEF3F8",
    categories: ["finance", "productivity"],
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
        purpose: "any",
      },
      {
        // Android crops icons to its own shape. A maskable icon is what stops
        // it framing the artwork inside a white circle, which is the "meh"
        // look you get with no manifest at all.
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Expenses", url: "/expenses" },
      { name: "Budget", url: "/budget" },
      { name: "Statistics", url: "/statistics" },
    ],
  };
}
