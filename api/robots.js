import config from "../site.config.js";
import { AI_BOTS } from "../lib/bots.js";
import { origin } from "../lib/render.js";

function handler() {
  const lines = config.aiScraping ? [] : AI_BOTS.flatMap((b) => [`User-agent: ${b}`, "Disallow: /", ""]);
  lines.push("User-agent: *", "Disallow: /admin/", "Disallow: /api/", "Disallow: /t/", "", `Sitemap: ${origin}/sitemap.xml`, "");
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

export default { fetch: handler };
