// Smoke test: boots the app against an in-memory database and exercises the HTTP surface.
// Run with `npm test`. It does not touch Blob or Neon, so uploads are only checked for auth.
process.env.LOCAL_DB = "memory://";
process.env.ADMIN_PASSWORD = "correct horse";
process.env.SESSION_SECRET = "test-secret-0123456789";
delete process.env.DATABASE_URL;
process.env.SMS_NUMBER = "+1 (530) 555-0100";
process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_teststore_0123456789abcdef"; // fake: tokens are signed locally, no network

const { start } = await import("./dev.js");
const server = await start(0);
const base = `http://localhost:${server.address().port}`;

let failed = 0;
const check = (name, ok, extra = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`); };
const J = { "content-type": "application/json" };
const req = (path, o = {}) => fetch(base + path, { redirect: "manual", ...o });
const post = (cookie, type, data) => req("/api/post", { method: "POST", headers: { ...J, ...(cookie && { cookie }) }, body: JSON.stringify({ type, data }) });
const count = (s, re) => (s.match(re) || []).length;

// --- empty site ---
let r = await req("/");
let t = await r.text();
check("empty feed renders", r.status === 200 && count(t, /<article/g) === 0);
check("header has logo for light and dark", t.includes('src="/logo-light.png"') && t.includes('srcset="/logo-dark.png"'));
check("front page has site preview tags", t.includes('property="og:title" content="Kitagram"') && t.includes('property="og:description" content="FUCK THE ALGORITHM.') && t.includes('property="og:image" content="https://www.kitagram.app/og.png?v=4"') && t.includes('og:url" content="https://www.kitagram.app/"') && t.includes('name="twitter:card" content="summary_large_image"'));
check("header shows name and subtitle", t.includes('class="wordmark">Kitagram<') && t.includes('lengthAdjust="spacingAndGlyphs">FUCK THE ALGORITHM. NO LIKES. NO FOLLOWS. JUST MY SHIT.<'));

// --- auth ---
r = await post(null, "text", { body: "x" });
check("posting without login is refused (401)", r.status === 401);
r = await req("/api/login", { method: "POST", headers: J, body: JSON.stringify({ password: "wrong" }) });
check("wrong password refused (401)", r.status === 401);
r = await req("/api/login", { method: "POST", headers: J, body: JSON.stringify({ password: "correct horse" }) });
const cookie = (r.headers.get("set-cookie") || "").split(";")[0];
check("right password signs in and sets a cookie", r.status === 200 && cookie.startsWith("kg="));
check("cookie is HttpOnly and long-lived", /HttpOnly/.test(r.headers.get("set-cookie")) && /Max-Age=31536000/.test(r.headers.get("set-cookie")));
check("/api/me accepts the cookie", (await req("/api/me", { headers: { cookie } })).status === 200);
check("/api/me refuses no cookie", (await req("/api/me")).status === 401);
check("tampered cookie refused", (await req("/api/me", { headers: { cookie: cookie.slice(0, -3) + "AAA" } })).status === 401);
r = await req("/api/post", { method: "POST", headers: { cookie, "content-type": "text/plain" }, body: "{}" });
check("non-JSON post refused (blocks forged forms)", r.status === 400);

// --- creating posts, all six types ---
const made = [];
for (const [type, data] of [
  ["text", { title: "Hello", body: "One.\n\nTwo <script>alert(1)</script>" }],
  ["quote", { text: "A quote", source: "Someone" }],
  ["link", { url: "https://example.com/page", title: "Example" }],
  ["photo", { src: "/seed/photo-1.svg", alt: "alt", caption: "cap" }],
  ["audio", { src: "/seed/tone.wav", title: "Tone" }],
  ["video", { src: "/seed/clip.mp4", caption: "Clip" }],
]) {
  r = await post(cookie, type, data);
  const out = await r.json();
  made.push(out.id);
  check(`create ${type}`, r.status === 201 && /^\/p\/\d+$/.test(out.url), JSON.stringify(out));
}

// --- validation ---
for (const [name, type, data] of [
  ["javascript: link rejected", "link", { url: "javascript:alert(1)", title: "x" }],
  ["http media src rejected", "photo", { src: "http://evil.test/a.jpg" }],
  ["protocol-relative media src rejected", "photo", { src: "//evil.test/a.jpg" }],
  ["unknown type rejected", "nope", { body: "x" }],
  ["__proto__ type rejected", "__proto__", { body: "x" }],
  ["missing required field rejected", "text", { title: "no body" }],
  ["over-long field rejected", "text", { body: "x".repeat(20001) }],
]) check(name, (await post(cookie, type, data)).status === 400);

// --- public pages ---
t = await (await req("/")).text();
check("feed shows all six, no script tags", count(t, /<article/g) === 6 && !t.includes("<script"));
check("feed is newest first", [...t.matchAll(/href="\/p\/(\d+)"/g)].map((m) => m[1]).join() === [...made].reverse().join());
check("post text is escaped", t.includes("&lt;script&gt;") && !t.includes("<script>alert"));
for (const tag of ["<blockquote", "link-card", "<audio", "<video", 'class="square"', "<h2"]) check(`renders ${tag}`, t.includes(tag));
r = await req(`/p/${made[0]}`);
t = await r.text();
check("permalink works", r.status === 200 && t.includes("Hello") && t.includes("← Back"));
check("permalink has preview tags", t.includes('property="og:title"') && t.includes(`og:url" content="https://www.kitagram.app/p/${made[0]}"`) && t.includes('rel="canonical"'));
{
  const { og } = await import("./lib/render.js");
  const mk = (type, data) => og({ id: "9", type, date: "2026-10-20T19:00:00Z", data });
  const val = (h, k) => h.match(new RegExp(`(?:property|name)="${k}" content="([^"]*)"`))?.[1];
  const text = mk("text", { body: "A long thought about why the feed is dead. ".repeat(10) });
  check("text post preview: image is the site card, title cut, description differs", val(text, "og:image") === "https://www.kitagram.app/og.png?v=4" && val(text, "og:title").length <= 70 && val(text, "og:title").endsWith("…") && val(text, "og:description") !== val(text, "og:title"));
  const photo = mk("photo", { src: "https://x.test/a.jpg", caption: "Dropping in on friends." });
  check("photo preview: its own picture, caption title, description not a repeat", val(photo, "og:image") === "https://x.test/a.jpg" && val(photo, "og:title") === "Dropping in on friends." && val(photo, "og:description") === "Kitagram · Oct 20, 2026" && val(photo, "twitter:card") === "summary_large_image");
  check("quote + link + audio previews", val(mk("quote", { text: "Hi", source: "Me" }), "og:title") === "“Hi”" && val(mk("link", { title: "T", url: "https://a.com/x" }), "og:description") === "a.com" && val(mk("audio", { title: "S", artist: "A", src: "/a.mp3" }), "og:description") === "A · audio");
  check("preview tags escape quotes", !mk("text", { body: 'a "quoted" <b>' }).includes('<b>'));
}
check("permalink has text + copy share", t.includes('href="sms:?body=https%3A%2F%2Fwww.kitagram.app%2Fp%2F') && t.includes('id="copy"'));
check("feed stays script-free", !(await (await req("/")).text()).includes("<script"));
const site = await (await req("/manifest.webmanifest")).json();
check("public manifest is a plain home-screen app", site.start_url === "/" && site.scope === "/" && !site.share_target);
check("feed links to manifest and /add", (await (await req("/")).text()).includes('rel="manifest" href="/manifest.webmanifest"') && (await (await req("/")).text()).includes('href="/add"'));
r = await req("/add");
check("/add explains install", r.status === 200 && (await r.text()).includes("Add to Home screen") && (await req("/add").then((x) => x.text())).includes("appinstalled"));
const robots = await (await req("/robots.txt")).text();
check("robots.txt blocks AI crawlers, not people", robots.includes("User-agent: GPTBot\nDisallow: /") && robots.includes("User-agent: ClaudeBot") && robots.includes("User-agent: *\nDisallow: /admin/") && !/User-agent: \*\nDisallow: \/\n/.test(robots));
check("named AI crawler gets 403", (await req("/", { headers: { "user-agent": "Mozilla/5.0 (compatible; GPTBot/1.2)" } })).status === 403 && (await req(`/p/${made[0]}`, { headers: { "user-agent": "ClaudeBot/1.0" } })).status === 403);
r = await req("/", { headers: { "user-agent": "Mozilla/5.0 (Linux; Android 14) Chrome/130" } });
check("normal browser still gets the feed + noai headers", r.status === 200 && r.headers.get("x-robots-tag") === "noai, noimageai" && (await r.text()).includes('name="robots" content="noai, noimageai"'));
check("search engines are not blocked", (await req("/", { headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" } })).status === 200);
check("every post has a Text Kit link, and the number is nowhere in the HTML", count(t, /class="text-me" href="\/t\/\d+"/g) === count(t, /<article/g) && count(t, /<article/g) > 0 && !t.includes("5305550100") && !(await (await req("/add")).text()).includes("5305550100"));
// Node's fetch forces Sec-Fetch-Mode: cors, so send these over raw HTTP to look like a browser tap.
const { request: httpRequest } = await import("node:http");
const raw = (path, headers) => new Promise((ok, no) => { const q = httpRequest(base + path, { headers }, (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => ok({ status: res.statusCode, headers: res.headers, text: b })); }); q.on("error", no); q.end(); });
const tap = { "sec-fetch-site": "same-origin", "sec-fetch-mode": "navigate", "sec-fetch-user": "?1", "sec-fetch-dest": "document" };
r = await raw(`/t/${made[0]}`, tap);
check("a real tap gets the sms: redirect with the post link", r.status === 302 && r.headers.location === `sms:+15305550100?body=Re%3A%20https%3A%2F%2Fwww.kitagram.app%2Fp%2F${made[0]}%0A`);
r = await req(`/t/${made[0]}`);
check("plain HTTP client gets 403 and no number", r.status === 403 && !(await r.text()).includes("5305550100") && !(r.headers.get("location") || ""));
check("forged cross-site / non-user requests get 403", (await raw(`/t/${made[0]}`, { ...tap, "sec-fetch-site": "cross-site" })).status === 403 && (await raw(`/t/${made[0]}`, { ...tap, "sec-fetch-user": "?0" })).status === 403);
check("robots.txt hides /t/", (await (await req("/robots.txt")).text()).includes("Disallow: /t/"));
const { execFileSync } = await import("node:child_process");
const off = execFileSync("node", ["-e", 'import("./lib/render.js").then(m=>console.log(m.post({id:"1",type:"text",date:"2026-01-01T00:00:00Z",data:{body:"x"}})))'], { env: { ...process.env, SMS_NUMBER: "" } }).toString();
check("no number set = no Text Kit link", !off.includes("text-me"));
check("missing permalink is 404", (await req("/p/99999")).status === 404 && (await req("/p/abc")).status === 404);
check("theme css served", (await (await req("/theme.css")).text()).includes("--bg:"));
const manifest = await (await req("/admin/manifest.webmanifest")).json();
check("manifest has share target for files", manifest.share_target?.params?.files?.[0]?.name === "media" && manifest.scope === "/admin/");

// --- pagination (20 per page) ---
for (let i = 0; i < 20; i++) await post(cookie, "text", { body: `filler ${i}` });
t = await (await req("/")).text();
check("page 1 has 20 posts and an Older link", count(t, /<article/g) === 20 && t.includes("Older →") && !t.includes("Newer"));
t = await (await req("/?page=2")).text();
check("page 2 has the other 6 and a Newer link", count(t, /<article/g) === 6 && t.includes("← Newer") && !t.includes("Older"));

// --- backup, delete, upload auth ---
check("export refused without login", (await req("/api/export")).status === 401);
const backup = await (await req("/api/export", { headers: { cookie } })).json();
check("export returns every post", Array.isArray(backup) && backup.length === 26);
check("delete refused without login", (await req("/api/post", { method: "DELETE", headers: J, body: JSON.stringify({ id: made[0] }) })).status === 401);
r = await req("/api/post", { method: "DELETE", headers: { ...J, cookie }, body: JSON.stringify({ id: made[0] }) });
check("delete works", r.status === 200 && (await req(`/p/${made[0]}`)).status === 404);
const tokenReq = { type: "blob.generate-client-token", payload: { pathname: "a.jpg", clientPayload: null, multipart: false } };
r = await req("/api/upload", { method: "POST", headers: J, body: JSON.stringify(tokenReq) });
let out = await r.json();
check("upload token refused when not signed in", r.status === 400 && /Not signed in/.test(out.error), JSON.stringify(out));
r = await req("/api/upload", { method: "POST", headers: { ...J, cookie }, body: JSON.stringify(tokenReq) });
out = await r.json();
check("upload token issued when signed in", r.status === 200 && typeof out.clientToken === "string", JSON.stringify(out));

server.close();
console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
