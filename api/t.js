import config from "../site.config.js";

// "Text Kit". The number is never in any page's HTML: posts link here, and this answers with the sms: redirect
// only to a real browser navigation from a user's tap (Sec-Fetch-* headers). Plain HTTP clients, crawlers and
// regex scrapers get a 403 and never see the number. A scraper that drives a real browser and fakes a tap still can.
function handler(request) {
  const n = String(config.textMe?.number || "").replace(/[^\d+]/g, "");
  const id = new URL(request.url).searchParams.get("id");
  if (!/^\+?\d{7,15}$/.test(n) || !/^\d{1,9}$/.test(id || "")) return new Response("Not found", { status: 404 });

  const h = (k) => request.headers.get(k);
  const tapped = h("sec-fetch-site") === "same-origin" && h("sec-fetch-mode") === "navigate" && h("sec-fetch-user") === "?1" && h("sec-fetch-dest") === "document";
  if (!tapped) return new Response("Tap “Text” on a post to message.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" } });

  const body = encodeURIComponent(`Re: https://${config.domain}/p/${id}\n`);
  return new Response(null, { status: 302, headers: { location: `sms:${n}?body=${body}`, "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

export default { fetch: handler };
