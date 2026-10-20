import config from "../site.config.js";
import { listPosts } from "../lib/db.js";
import { aiBlocked } from "../lib/bots.js";
import { html, page, post, siteOg, tile, views } from "../lib/render.js";

const PAGE = 20;
const GRID = 30;

async function handler(request) {
  const no = aiBlocked(request);
  if (no) return no;
  const q = new URL(request.url).searchParams;
  const grid = q.get("view") === "grid";
  const per = grid ? GRID : PAGE;
  const base = grid ? "/grid" : "/";
  const n = Math.max(1, parseInt(q.get("page"), 10) || 1);
  const { posts, more } = await listPosts(per, (n - 1) * per);
  const nav = [n > 1 && `<a href="${base}${n > 2 ? `?page=${n - 1}` : ""}">← Newer</a>`, more && `<a href="${base}?page=${n + 1}">Older →</a>`].filter(Boolean).join(" &nbsp; ");
  const list = grid ? `<div class="grid">${posts.map(tile).join("")}</div>` : posts.map((p) => post(p, true)).join("\n");
  return html(page(`${config.name} · ${config.author.name}`, views(grid ? "grid" : "feed") + list + (nav ? `<p class="end">${nav}</p>` : ""), siteOg(n > 1 ? `${base}?page=${n}` : base)));
}

export default { fetch: handler };
