import config from "../site.config.js";
import { AI_BOTS } from "../lib/bots.js";

function handler() {
  const lines = config.aiScraping ? [] : AI_BOTS.flatMap((b) => [`User-agent: ${b}`, "Disallow: /", ""]);
  lines.push("User-agent: *", "Disallow: /admin/", "Disallow: /api/", "");
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

export default { fetch: handler };
