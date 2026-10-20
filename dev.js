// Local server: mounts api/*.js the way Vercel does and serves public/. Run with `npm run dev`.
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

// Local-only defaults. Production sets real values in Vercel.
process.env.ADMIN_PASSWORD ??= "dev";
process.env.SESSION_SECRET ??= "local-dev-secret-change-me";
process.env.LOCAL_DB ??= ".data/pglite"; // posts survive restarts

const PUBLIC = resolve("public");
const SEED = resolve("dev/seed");
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".wav": "audio/wav",
};

// Same rewrites as vercel.json.
function route(url) {
  let m;
  if (url.pathname === "/") return "feed";
  if ((m = url.pathname.match(/^\/p\/([^/]+)$/))) { url.searchParams.set("id", m[1]); return "p"; }
  if (url.pathname === "/theme.css") return "theme";
  if (url.pathname === "/admin/manifest.webmanifest") return "manifest";
  if ((m = url.pathname.match(/^\/api\/(\w+)$/))) return m[1];
}

function file(path) {
  const base = path.startsWith("/seed/") ? SEED : PUBLIC;
  const f = resolve(join(base, path.startsWith("/seed/") ? path.slice(5) : path === "/admin" ? "/admin/index.html" : path));
  if (!f.startsWith(base + sep)) return null;
  if (existsSync(f) && statSync(f).isDirectory()) return join(f, "index.html");
  return existsSync(f) ? f : null;
}

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const name = route(url);
  if (name) {
    const path = resolve("api", `${name}.js`);
    if (!existsSync(path)) { res.writeHead(404).end("Not found"); return; }
    const mod = await import(pathToFileURL(path));
    const body = req.method === "GET" || req.method === "HEAD" ? undefined : Readable.toWeb(req);
    const out = await mod.default.fetch(new Request(url, { method: req.method, headers: req.headers, body, duplex: "half" }));
    const headers = {};
    out.headers.forEach((v, k) => { if (k !== "set-cookie") headers[k] = v; });
    const cookies = out.headers.getSetCookie();
    if (cookies.length) headers["set-cookie"] = cookies;
    res.writeHead(out.status, headers).end(Buffer.from(await out.arrayBuffer()));
    return;
  }
  const f = file(url.pathname);
  if (f) { res.writeHead(200, { "content-type": MIME[extname(f)] ?? "application/octet-stream" }); createReadStream(f).pipe(res); return; }
  res.writeHead(404, { "content-type": MIME[".html"] });
  createReadStream(join(PUBLIC, "404.html")).pipe(res);
}

export function start(port = process.env.PORT ?? 3000) {
  const server = createServer((req, res) =>
    handle(req, res).catch((e) => { console.error(e); if (!res.headersSent) res.writeHead(500); res.end("Server error"); })
  );
  return new Promise((ok) => server.listen(port, () => ok(server)));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await start();
  console.log(`Local: http://localhost:${server.address().port}   Composer: /admin/   Password: ${process.env.ADMIN_PASSWORD}`);
}
