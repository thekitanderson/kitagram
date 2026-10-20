import themeCss from "../lib/theme.js";

function handler() {
  return new Response(themeCss(), { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=300" } });
}

export default { fetch: handler };
