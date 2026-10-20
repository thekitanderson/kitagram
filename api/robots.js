import { allPosts } from "../lib/db.js";
import config from "../site.config.js";
import { AI_BOTS } from "../lib/bots.js";
import { origin } from "../lib/render.js";

const x = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (u) => (u.startsWith("/") ? origin + u : u);

// /sitemap.xml is served from here too (Hobby plan caps the function count).
// Every public page, with photos listed for image search.
async function sitemap() {
  const posts = await allPosts();
  const urls = [
    `<url><loc>${origin}/</loc>${posts[0] ? `<lastmod>${x(posts[0].date)}</lastmod>` : ""}</url>`,
    ...posts.map((p) => `<url><loc>${origin}/p/${x(p.id)}</loc><lastmod>${x(p.date)}</lastmod>${p.type === "photo" && p.data.src ? `<image:image><image:loc>${x(abs(p.data.src))}</image:loc></image:image>` : ""}</url>`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}


function handler(request) {
  if (new URL(request.url).searchParams.has("sitemap")) return sitemap();
  return robots();
}

function robots() {
  const lines = config.aiScraping ? [] : AI_BOTS.flatMap((b) => [`User-agent: ${b}`, "Disallow: /", ""]);
  lines.push("User-agent: *", "Disallow: /admin/", "Disallow: /api/", "Disallow: /t/", "", `Sitemap: ${origin}/sitemap.xml`, "");
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

export default { fetch: handler };
