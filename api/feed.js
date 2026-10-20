import config from "../site.config.js";
import { listPosts } from "../lib/db.js";
import { aiBlocked } from "../lib/bots.js";
import { html, page, post, siteOg } from "../lib/render.js";

const PAGE = 20;

async function handler(request) {
  const no = aiBlocked(request);
  if (no) return no;
  const n = Math.max(1, parseInt(new URL(request.url).searchParams.get("page"), 10) || 1);
  const { posts, more } = await listPosts(PAGE, (n - 1) * PAGE);
  const nav = [n > 1 && `<a href="/${n > 2 ? `?page=${n - 1}` : ""}">← Newer</a>`, more && `<a href="/?page=${n + 1}">Older →</a>`].filter(Boolean).join(" &nbsp; ");
  return html(page(config.name, posts.map(post).join("\n") + (nav ? `<p class="end">${nav}</p>` : ""), siteOg(n > 1 ? `/?page=${n}` : "/")));
}

export default { fetch: handler };
