import config from "../site.config.js";
import { getPost } from "../lib/db.js";
import { html, label, page, post } from "../lib/render.js";

async function handler(request) {
  const p = await getPost(new URL(request.url).searchParams.get("id"));
  if (!p) return html(page(`Not found · ${config.name}`, `<p class="end">Nothing here. <a href="/">Go back.</a></p>`), 404);
  return html(page(`${label(p)} · ${config.name}`, post(p) + `<p class="end"><a href="/">← Back</a></p>`));
}

export default { fetch: handler };
