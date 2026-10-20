import config from "../site.config.js";
import { getPost } from "../lib/db.js";
import { aiBlocked } from "../lib/bots.js";
import { html, label, og, page, post, share } from "../lib/render.js";

async function handler(request) {
  const no = aiBlocked(request);
  if (no) return no;
  const p = await getPost(new URL(request.url).searchParams.get("id"));
  if (!p) return html(page(`Not found · ${config.name}`, `<p class="end">Nothing here. <a href="/">Go back.</a></p>`), 404);
  return html(page(`${label(p)} · ${config.name}`, post(p) + share(p) + `<p class="end"><a href="/">← Back</a></p>`, og(p)));
}

export default { fetch: handler };
