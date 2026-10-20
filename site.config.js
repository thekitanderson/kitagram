// Everything brand-specific lives here. Rebrand = edit this file + swap /public assets.
export default {
  name: "Kitagram",
  tagline: "FUCK THE ALGORITHM. NO LIKES. NO FOLLOWS. JUST MY SHIT.",
  // Canonical domain: one value. Used for share links and previews.
  domain: "kitagram.app",

  // AI training/scraping. false = refuse known AI crawlers (robots.txt, headers, and a 403 for ones that identify themselves). true = allow.
  aiScraping: false,

  // App icon background (splash screen). Icons live in public/admin/icon-192.png and icon-512.png.
  iconBg: "#000000",

  // Logo (top right of the header): files in /public. logo = for light backgrounds; logoDark (optional) = for dark mode. null = no logo.
  logo: "/logo-light.png",
  logoDark: "/logo-dark.png",

  theme: {
    // Light is the default. Dark applies automatically when the visitor's device is set to dark.
    light: {
      bg: "#ffffff",
      text: "#111111",
      muted: "#737373",
      line: "#ebebeb",
      accent: "#111111",
      media: "#000000", // behind photos and video
    },
    dark: {
      bg: "#0b0b0b",
      text: "#f5f5f5",
      muted: "#a0a0a0",
      line: "#242424",
      accent: "#f5f5f5",
      media: "#000000",
    },
    fontBody:
      '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
    maxWidth: "600px",
  },

  // Optional text. Empty = nothing rendered.
  footer: "",
  endNote: "",
};

