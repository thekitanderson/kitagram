import config from "../site.config.js";
import themeCss from "./theme.js";

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

// Only http(s) links; a bad URL never breaks a page.
const parse = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x : null; } catch { return null; } };

function body({ type, data: d }) {
  switch (type) {
    case "text":
      return `<div class="pad">${d.title ? `<h2 class="text-title">${esc(d.title)}</h2>` : ""}${String(d.body).split(/\n{2,}/).map((p) => `<p>${esc(p.trim())}</p>`).join("")}</div>`;
    case "photo":
      return `<img class="square" src="${esc(d.src)}" alt="${esc(d.alt || "")}" loading="lazy">${d.caption ? `<p class="pad caption">${esc(d.caption)}</p>` : ""}`;
    case "quote":
      return `<figure class="pad quote"><blockquote>${esc(d.text)}</blockquote>${d.source ? `<figcaption>${esc(d.source)}</figcaption>` : ""}</figure>`;
    case "link": {
      const u = parse(d.url);
      return `<div class="pad"><a class="link-card" href="${esc(u ? u.href : "#")}" rel="noopener noreferrer"><strong>${esc(d.title)}</strong><span>${esc(u ? u.hostname : d.url)}</span></a>${d.note ? `<p class="caption">${esc(d.note)}</p>` : ""}</div>`;
    }
    case "audio":
      return `<div class="pad audio">${d.cover ? `<img class="cover" src="${esc(d.cover)}" alt="">` : ""}<div class="audio-body"><strong>${esc(d.title)}</strong>${d.artist ? `<span class="muted">${esc(d.artist)}</span>` : ""}<audio controls preload="none" src="${esc(d.src)}"></audio></div></div>`;
    case "video":
      return `<video class="square" controls preload="metadata" ${d.poster ? `poster="${esc(d.poster)}"` : ""} src="${esc(d.src)}"></video>${d.caption ? `<p class="pad caption">${esc(d.caption)}</p>` : ""}`;
    default:
      return "";
  }
}

export const post = (p) =>
  `<article class="post">${body(p)}<footer class="pad meta"><a href="/p/${esc(p.id)}"><time datetime="${esc(p.date)}">${fmt.format(new Date(p.date))}</time></a></footer></article>`;

export const label = (p) => p.data.title || p.data.caption || p.data.text?.slice(0, 60) || p.type;

export const page = (title, main, head = "") => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><link rel="manifest" href="/manifest.webmanifest">
<title>${esc(title)}</title>${config.tagline ? `<meta name="description" content="${esc(config.tagline)}">` : ""}
${head}
<style>${themeCss()}</style><link rel="stylesheet" href="/styles.css"></head><body>
<header class="site-header"><a href="/">${config.logo ? `<img src="${esc(config.logo)}" alt="${esc(config.name)}" height="24">` : `<span class="wordmark">${esc(config.name)}</span>`}</a></header>
<main>${main}</main>
<footer class="site-footer">${config.footer ? `<span>${esc(config.footer)}</span> ` : ""}<a href="/add">Add to Home Screen</a></footer>
</body></html>`;

export const origin = `https://${config.domain}`;
const abs = (u) => (u ? (u.startsWith("/") ? origin + u : u) : "");

// Link-preview tags for a single post.
export function og(p) {
  const d = p.data;
  const desc = (d.caption || d.body || d.text || d.note || d.artist || "").replace(/\s+/g, " ").trim().slice(0, 200);
  const img = abs(p.type === "photo" ? d.src : p.type === "audio" ? d.cover : p.type === "video" ? d.poster : "");
  const tags = [
    ["og:type", "article"],
    ["og:site_name", config.name],
    ["og:title", label(p)],
    ["og:url", `${origin}/p/${p.id}`],
    desc && ["og:description", desc],
    img && ["og:image", img],
  ].filter(Boolean);
  const card = `<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">`;
  return tags.map(([k, v]) => `<meta property="${k}" content="${esc(v)}">`).join("\n") + "\n" + card + `\n<link rel="canonical" href="${origin}/p/${esc(p.id)}">`;
}

// Share row for the permalink page: text it, or copy the link. Copy needs a few lines of JS; the SMS link does not.
export const share = (p) => {
  const url = `${origin}/p/${p.id}`;
  return `<p class="share"><a href="sms:?body=${encodeURIComponent(url)}">Text it</a><button type="button" id="copy" hidden>Copy link</button></p>
<script>var b=document.getElementById("copy");if(b&&navigator.clipboard){b.hidden=false;b.onclick=function(){navigator.clipboard.writeText(${JSON.stringify(url).replace(/</g, "\\u003c")}).then(function(){b.textContent="Copied"})}}</script>`;
};

export const html = (body, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" } });
