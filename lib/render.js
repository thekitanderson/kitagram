import { embedOf } from "./embed.js";
import config from "../site.config.js";
import themeCss from "./theme.js";

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

// Only http(s) links; a bad URL never breaks a page.
const parse = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x : null; } catch { return null; } };

function body({ type, data: d }, h1 = false) {
  const cap = (t) => (h1 ? `<h1 class="pad caption">${t}</h1>` : `<p class="pad caption">${t}</p>`);
  switch (type) {
    case "text":
      return `<div class="pad">${d.title ? `<${h1 ? "h1" : "h2"} class="text-title">${esc(d.title)}</${h1 ? "h1" : "h2"}>` : ""}${String(d.body).split(/\n{2,}/).map((p) => `<p>${esc(p.trim())}</p>`).join("")}</div>`;
    case "photo":
      return `<img class="square" src="${esc(d.src)}" alt="${esc(`${d.alt || d.caption || "Photo"} — photo by ${config.author.name}`)}" loading="lazy">${d.caption ? cap(esc(d.caption)) : ""}`;
    case "quote":
      return `<figure class="pad quote"><blockquote>${esc(d.text)}</blockquote>${d.source ? `<figcaption>${esc(d.source)}</figcaption>` : ""}</figure>`;
    case "link": {
      const u = parse(d.url);
      return `<div class="pad"><a class="link-card" href="${esc(u ? u.href : "#")}" rel="noopener noreferrer"><strong>${esc(d.title)}</strong><span>${esc(u ? u.hostname : d.url)}</span></a>${d.note ? `<p class="caption">${esc(d.note)}</p>` : ""}</div>`;
    }
    case "audio":
      return `<div class="pad audio">${d.cover ? `<img class="cover" src="${esc(d.cover)}" alt="">` : ""}<div class="audio-body"><strong>${esc(d.title)}</strong>${d.artist ? `<span class="muted">${esc(d.artist)}</span>` : ""}<audio controls preload="none" src="${esc(d.src)}"></audio></div></div>`;
    case "video":
      return `${d.src ? `<video class="square" controls playsinline preload="metadata" ${d.poster ? `poster="${esc(d.poster)}"` : ""} src="${esc(d.src)}"></video>` : `<iframe class="embed" src="${esc(embedOf(d.embed)?.src || "")}" title="${esc(d.caption || "Video")}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`}${d.caption ? cap(esc(d.caption)) : ""}`;
    default:
      return "";
  }
}

// "Text Kit": a plain link to /t/:id, which redirects to the owner's messaging app. The number is never in the HTML (see api/t.js).
const textMe = (p) =>
  /^\+?\d{7,15}$/.test(String(config.textMe?.number || "").replace(/[^\d+]/g, ""))
    ? ` <a class="text-me" href="/t/${esc(p.id)}" rel="nofollow">Text ${esc(config.textMe.name || "me")}</a>`
    : "";

export const post = (p, tap = false, h1 = false) =>
  `<article class="post${tap ? " tap" : ""}">${body(p, h1)}<footer class="pad meta"><a href="/p/${esc(p.id)}"><time datetime="${esc(p.date)}">${fmt.format(new Date(p.date))}</time></a>${textMe(p)}<button type="button" class="sh" data-u="${esc(origin + "/p/" + p.id)}" hidden>Share</button></footer></article>`;

// Grid view: photos and video stills fill the square; everything else is a text tile.
export const tile = (p) => {
  const d = p.data;
  const img = p.type === "photo" ? d.src : p.type === "video" ? d.poster || (d.embed && embedOf(d.embed)?.poster) : p.type === "audio" ? d.cover : null;
  const text = d.title || d.body || d.text || d.caption || d.url || p.type;
  const alt = p.type === "photo" ? `${d.alt || d.caption || "Photo"} — photo by ${config.author.name}` : text;
  return `<a class="tile${img ? "" : " txt"}${p.type === "quote" ? " q" : ""}" href="/p/${esc(p.id)}" aria-label="${esc(String(text).slice(0, 100))}">${img ? `<img src="${esc(img)}" alt="${esc(alt)}" loading="lazy">` : `<span>${esc(String(text).slice(0, 160))}</span>`}</a>`;
};

export const views = (current) =>
  `<nav class="views" aria-label="View"><a href="/"${current === "grid" ? ' aria-current="page"' : ""}>Grid</a><a href="/feed"${current === "feed" ? ' aria-current="page"' : ""}>Feed</a></nav>`;

export const label = (p) => p.data.title || p.data.caption || p.data.text?.slice(0, 60) || p.type;

export const page = (title, main, head = "", desc = config.description || config.tagline, h1 = false) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">${config.aiScraping ? "" : '<meta name="robots" content="noai, noimageai">'}<link rel="manifest" href="/manifest.webmanifest"><link rel="icon" type="image/png" href="/admin/icon-192.png"><link rel="apple-touch-icon" href="/admin/icon-192.png">
<title>${esc(title)}</title>${desc ? `<meta name="description" content="${esc(desc)}">` : ""}<meta name="author" content="${esc(config.author.name)}">
${head}
<style>${themeCss()}</style><link rel="stylesheet" href="/styles.css"></head><body>
<header class="site-header"><div class="hd"><a class="brand" href="/">${config.logo ? `<picture class="logo">${config.logoDark ? `<source media="(prefers-color-scheme: dark)" srcset="${esc(config.logoDark)}">` : ""}<img src="${esc(config.logo)}" alt=""></picture>` : ""}<${h1 ? "h1" : "span"} class="wordmark">${esc(config.name)} by ${esc(config.author.name)}</${h1 ? "h1" : "span"}></a>${config.subtitle ? `<svg class="tagline" style="width:${Math.round(config.subtitle.length * 8)}px" viewBox="0 0 ${Math.round(config.subtitle.length * 6.8)} 14" role="img" aria-label="${esc(config.subtitle)}"><text x="0" y="11" font-size="12" textLength="${Math.round(config.subtitle.length * 6.8)}" lengthAdjust="spacingAndGlyphs">${esc(config.subtitle)}</text></svg>` : ""}</div></header>
<main>${main}</main>
<script>if(navigator.share){document.querySelectorAll(".sh").forEach(function(b){b.hidden=false});document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest(".sh");if(b){navigator.share({url:b.dataset.u}).catch(function(){})}})}</script>
<footer class="site-footer">${config.footer ? `<span>${esc(config.footer)}</span> ` : ""}<a href="/add">Add ${esc(config.name)} App to Homescreen</a></footer>
</body></html>`;

export const origin = `https://${config.domain}`;
const abs = (u) => (u ? (u.startsWith("/") ? origin + u : u) : "");

const flat = (v) => String(v || "").replace(/\s+/g, " ").trim();
const cut = (v, n) => (v.length > n ? v.slice(0, n - 1).trimEnd() + "…" : v);

// What a messaging app shows for a shared post: a title, a different description, and always an image.
// Posts without their own picture get the site card (public/og.png).
export function preview(p) {
  const d = p.data;
  const date = fmt.format(new Date(p.date));
  let title, desc, img;
  switch (p.type) {
    case "text": title = d.title || d.body; desc = d.title ? d.body : ""; break;
    case "photo": title = d.caption; desc = d.alt; img = d.src; break;
    case "quote": title = `“${flat(d.text)}”`; desc = d.source; break;
    case "link": title = d.title; desc = d.note || (parse(d.url)?.hostname ?? ""); break;
    case "audio": title = d.title; desc = d.artist ? `${d.artist} · audio` : "Audio"; img = d.cover; break;
    case "video": title = d.caption; desc = "Video"; img = d.poster || (d.embed && embedOf(d.embed)?.poster); break;
  }
  title = cut(flat(title), 70) || config.name;
  desc = cut(flat(desc), 200);
  if (!desc || desc === title) desc = `${config.name} · ${date}`;
  return { title, desc, own: Boolean(img), img: abs(img || config.ogImage), alt: p.type === "photo" && d.alt ? flat(d.alt) : title };
}

const jsonld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const person = () => ({ "@type": "Person", name: config.author.name, url: origin + "/", ...(config.author.sameAs?.length && { sameAs: config.author.sameAs }) });

// Link-preview tags for a single post.
export function og(p) {
  const { title, desc, img, alt, own } = preview(p);
  const tags = [
    ["og:type", "article"],
    ["og:site_name", config.name],
    ["og:title", title],
    ["og:description", desc],
    ["og:url", `${origin}/p/${p.id}`],
    ["og:image", img],
    ["og:image:alt", alt],
    ["article:published_time", p.date],
  ];
  const meta = [
    ["twitter:card", "summary_large_image"],
    ["twitter:title", title],
    ["twitter:description", desc],
    ["twitter:image", img],
  ];
  return [
    ...tags.map(([k, v]) => `<meta property="${k}" content="${esc(v)}">`),
    ...meta.map(([k, v]) => `<meta name="${k}" content="${esc(v)}">`),
    `<link rel="canonical" href="${origin}/p/${esc(p.id)}">`,
    jsonld({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description: desc,
      datePublished: p.date,
      url: `${origin}/p/${p.id}`,
      mainEntityOfPage: `${origin}/p/${p.id}`,
      inLanguage: "en",
      author: person(),
      publisher: person(),
      ...(own && { image: p.type === "photo" ? { "@type": "ImageObject", contentUrl: img, url: img, caption: title, creator: person(), creditText: config.author.name, copyrightNotice: `© ${config.author.name}` } : img }),
    }),
  ].join("\n");
}

// Link-preview tags for the front page: sharing the site itself.
export function siteOg(path = "/") {
  const url = origin + path;
  const desc = config.tagline || config.name;
  const rows = [["property", "og:type", "website"], ["property", "og:site_name", config.name], ["property", "og:title", config.name], ["property", "og:description", desc], ["property", "og:url", url], ["property", "og:image", abs(config.ogImage)], ["property", "og:image:alt", config.name],
    ["name", "twitter:card", "summary_large_image"], ["name", "twitter:title", config.name], ["name", "twitter:description", desc], ["name", "twitter:image", abs(config.ogImage)]];
  return [
    ...rows.map(([a, k, v]) => `<meta ${a}="${k}" content="${esc(v)}">`),
    `<link rel="canonical" href="${esc(url)}">`,
    jsonld({ "@context": "https://schema.org", "@type": "WebSite", name: config.name, url: origin + "/", description: config.description, inLanguage: "en", author: person(), publisher: person() }),
  ].join("\n");
}

// Share row for the permalink page: text it, or copy the link. Copy needs a few lines of JS; the SMS link does not.
export const share = (p) => {
  const url = `${origin}/p/${p.id}`;
  return `<p class="share"><a href="sms:?body=${encodeURIComponent(url)}">Text it</a><button type="button" id="copy" hidden>Copy link</button></p>
<script>var b=document.getElementById("copy");if(b&&navigator.clipboard){b.hidden=false;b.onclick=function(){navigator.clipboard.writeText(${JSON.stringify(url).replace(/</g, "\\u003c")}).then(function(){b.textContent="Copied"})}}</script>`;
};

export const html = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate", ...(config.aiScraping ? {} : { "x-robots-tag": "noai, noimageai" }) },
  });
