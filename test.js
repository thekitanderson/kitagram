// Smoke test: boots the app against an in-memory database and exercises the HTTP surface.
// Run with `npm test`. It does not touch Blob or Neon, so uploads are only checked for auth.
process.env.LOCAL_DB = "memory://";
process.env.ADMIN_PASSWORD = "correct horse";
process.env.SESSION_SECRET = "test-secret-0123456789";
delete process.env.DATABASE_URL;
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
check("permalink has preview tags", t.includes('property="og:title"') && t.includes(`og:url" content="https://kitagram.app/p/${made[0]}"`) && t.includes('rel="canonical"'));
check("permalink has text + copy share", t.includes('href="sms:?body=https%3A%2F%2Fkitagram.app%2Fp%2F') && t.includes('id="copy"'));
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
