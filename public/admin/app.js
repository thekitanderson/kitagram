import { upload } from "/admin/blob-client.js";
import { shrink } from "/admin/photo.js";

const $ = (id) => document.getElementById(id);

// [field name, label, options]  req = required, area = textarea, file = accepted types
const FIELDS = {
  text: [["title", "Title (optional)"], ["body", "Write something", { area: 1, req: 1 }]],
  photo: [["file", "Photo", { file: "image/*", req: 1 }], ["caption", "Caption", { area: 1 }], ["alt", "Alt text (for screen readers)"]],
  quote: [["text", "Quote", { area: 1, req: 1 }], ["source", "Source"]],
  link: [["url", "Link", { type: "url", req: 1 }], ["title", "Title (defaults to the site name)"], ["note", "Note", { area: 1 }]],
  audio: [["file", "Audio", { file: "audio/*", req: 1 }], ["title", "Title (defaults to the file name)"], ["artist", "Artist"]],
  video: [["file", "Video", { file: "video/*", req: 1 }], ["caption", "Caption", { area: 1 }]],
};

let type = "photo";

const say = (text, href) => {
  const s = $("status");
  s.textContent = text;
  if (href) s.append(" ", Object.assign(document.createElement("a"), { href, textContent: "View" }));
};

function show(which) {
  $("login").hidden = which !== "login";
  $("compose").hidden = which !== "compose";
  if (which === "compose") render(type);
}

function render(t) {
  type = t;
  $("types").replaceChildren(
    ...Object.keys(FIELDS).map((k) => {
      const b = Object.assign(document.createElement("button"), { type: "button", textContent: k });
      b.setAttribute("aria-pressed", String(k === t));
      b.onclick = () => render(k);
      return b;
    })
  );
  $("fields").replaceChildren(
    ...FIELDS[t].map(([name, text, o = {}]) => {
      const label = document.createElement("label");
      label.append(text);
      const el = document.createElement(o.area ? "textarea" : "input");
      el.name = name;
      if (o.file) Object.assign(el, { type: "file", accept: o.file });
      else if (!o.area) el.type = o.type || "text";
      el.required = Boolean(o.req);
      label.append(el);
      return label;
    })
  );
  say("");
}

$("compose").addEventListener("submit", async (e) => {
  e.preventDefault();
  const v = Object.fromEntries(new FormData(e.currentTarget));
  const file = v.file;
  delete v.file;
  $("go").disabled = true;
  say("Posting…");
  try {
    if (type === "link" && !v.title) v.title = new URL(v.url).hostname;
    if (file) {
      const f = type === "photo" ? await shrink(file) : file;
      if (type === "audio" && !v.title) v.title = f.name.replace(/\.[^.]+$/, "");
      const blob = await upload(`kg/${f.name}`, f, {
        access: "public",
        handleUploadUrl: "/api/upload",
        multipart: f.size > 50e6,
        onUploadProgress: ({ percentage }) => say(`Uploading ${Math.round(percentage)}%`),
      });
      v.src = blob.url;
    }
    const r = await fetch("/api/post", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, data: v }) });
    if (r.status === 401) return show("login");
    const out = await r.json();
    if (!r.ok) throw new Error(out.error || "Failed");
    render(type);
    say("Posted.", out.url);
  } catch (err) {
    say(err.message);
  } finally {
    $("go").disabled = false;
  }
});

$("login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const r = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: $("pw").value }) });
  if (r.ok) { $("pw").value = ""; start(); } else $("lerr").textContent = "Wrong password";
});

// Android share menu -> the service worker stashed the shared item; turn it into a draft.
async function intake() {
  const cache = await caches.open("shared");
  const m = await cache.match("/shared/meta");
  if (!m) return;
  const meta = await m.json();
  const f0 = await cache.match("/shared/file-0");
  const file = f0 && new File([await f0.blob()], decodeURIComponent(f0.headers.get("x-name") || "shared"), { type: f0.headers.get("content-type") });
  await caches.delete("shared");
  history.replaceState(null, "", "/admin/");

  // Android often puts the shared link in `text`, not `url`.
  const link = (meta.url || meta.text.match(/https?:\/\/\S+/)?.[0] || "").trim();
  const rest = meta.text.replace(link, "").trim();
  const fill = (t, values) => {
    render(t);
    for (const [name, val] of Object.entries(values)) {
      const el = $("fields").querySelector(`[name="${name}"]`);
      if (!el || !val) continue;
      if (el.type === "file") { const dt = new DataTransfer(); dt.items.add(val); el.files = dt.files; } else el.value = val;
    }
  };
  const kind = file?.type.split("/")[0];
  if (kind === "image") fill("photo", { file, caption: rest || meta.title });
  else if (kind === "audio") fill("audio", { file, title: meta.title });
  else if (kind === "video") fill("video", { file, caption: rest || meta.title });
  else if (link) fill("link", { url: link, title: meta.title, note: rest });
  else fill("text", { title: meta.title, body: meta.text });
}

async function start() {
  const r = await fetch("/api/me");
  if (!r.ok) return show("login");
  show("compose");
  intake().catch(() => {});
}

navigator.serviceWorker?.register("/admin/sw.js", { scope: "/admin/" });
start();
