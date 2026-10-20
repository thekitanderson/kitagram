import config from "../site.config.js";

// Crawlers that collect content for AI training, AI search, or AI assistants.
export const AI_BOTS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "Claude-SearchBot", "Claude-User",
  "PerplexityBot", "Perplexity-User", "CCBot", "Bytespider", "Amazonbot", "meta-externalagent", "FacebookBot", "cohere-ai",
  "Diffbot", "ImagesiftBot", "Omgilibot", "YouBot", "DuckAssistBot", "Timpibot", "AI2Bot", "Applebot-Extended", "Google-Extended",
];

// Google-Extended and Applebot-Extended are robots.txt tokens, not user agents, so only robots.txt can address them.
const TOKEN_ONLY = new Set(["Google-Extended", "Applebot-Extended"]);
const UA = AI_BOTS.filter((b) => !TOKEN_ONLY.has(b)).map((b) => b.toLowerCase());

// A bot that names itself gets a 403. One that lies about its identity can't be caught here.
export function aiBlocked(request) {
  if (config.aiScraping) return null;
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  return UA.some((b) => ua.includes(b)) ? new Response("AI crawlers are not permitted.", { status: 403, headers: { "content-type": "text/plain" } }) : null;
}
