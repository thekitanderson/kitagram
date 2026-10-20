import { allPosts } from "../lib/db.js";
import { origin } from "../lib/render.js";

const x = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (u) => (u.startsWith("/") ? origin + u : u);

// Every public page, with photos listed for image search.
async function handler() {
  const posts = await allPosts();
  const urls = [
    `<url><loc>${origin}/</loc>${posts[0] ? `<lastmod>${x(posts[0].date)}</lastmod>` : ""}</url>`,
    ...posts.map((p) => `<url><loc>${origin}/p/${x(p.id)}</loc><lastmod>${x(p.date)}</lastmod>${p.type === "photo" && p.data.src ? `<image:image><image:loc>${x(abs(p.data.src))}</image:loc></image:image>` : ""}</url>`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}

export default { fetch: handler };
