// Everything brand-specific lives here. Rebrand = edit this file + swap /public assets.
export default {
  name: "Kitagram",
  tagline: "",
  // Canonical domain: one value. Used for share links and previews.
  domain: "kitagram.app",

  // AI training/scraping. false = refuse known AI crawlers (robots.txt, headers, and a 403 for ones that identify themselves). true = allow.
  aiScraping: false,

  // Logo slot: drop a file in /public and set the path. null = text wordmark.
  logo: null,

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

