import { upload } from "/admin/blob-client.js";
import { shrink, probeVideo } from "/admin/photo.js";

const $ = (id) => document.getElementById(id);

// [field name, label, options]  req = required, area = textarea, file = accepted types
const FIELDS = {
  text: [["title", "Title (optional)"], ["body", "Write something", { area: 1, req: 1 }]],
  photo: [["file", "Photo", { file: "image/*", req: 1 }], ["filename", "File name (e.g. kit-anderson-riding-tiger)"], ["caption", "Caption", { area: 1 }], ["alt", "Alt text (for screen readers)"]],
  quote: [["text", "Quote", { area: 1, req: 1 }], ["source", "Source"]],
  link: [["url", "Link", { type: "url", req: 1 }], ["title", "Title (defaults to the site name)"], ["note", "Note", { area: 1 }]],
  audio: [["file", "Audio", { file: "audio/*", req: 1 }], ["filename", "File name (optional)"], ["title", "Title (defaults to the file name)"], ["artist", "Artist"]],
  video: [["file", "Video file"], ["embed", "…or paste a YouTube / Vimeo link", { type: "url" }], ["filename", "File name (optional)"], ["caption", "Caption", { area: 1 }]],
};

let type = "photo";
let editing = null; // the post being edited, or null

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

function render(t, edit = null) {
  type = t;
  editing = edit;
  $("go").textContent = edit ? "Save" : "Post";
  $("editbar").hidden = !edit;
  $("types").replaceChildren(
    ...Object.keys(FIELDS).filter((k) => !edit || k === t).map((k) => {
      const b = Object.assign(document.createElement("button"), { type: "button", textContent: k });
      b.setAttribute("aria-pressed", String(k === t));
      b.onclick = () => render(k);
      return b;
    })
  );
  $("fields").replaceChildren(
    ...FIELDS[t].filter(([name, , o = {}]) => !edit || (!o.file && name !== "filename")).map(([name, text, o = {}]) => {
      const label = document.createElement("label");
      label.append(text);
      const el = document.createElement(o.area ? "textarea" : "input");
      el.name = name;
      if (o.file) Object.assign(el, { type: "file", accept: o.file });
      else if (!o.area) el.type = o.type || "text";
      el.required = Boolean(o.req);
      if (edit && edit.data[name] != null) el.value = edit.data[name];
      label.append(el);
      return label;
    })
  );
  say("");
}

$("cancel").addEventListener("click", () => render("photo"));

$("compose").addEventListener("submit", async (e) => {
  e.preventDefault();
  const v = Object.fromEntries(new FormData(e.currentTarget));
  const file = v.file && v.file.size ? v.file : null;
  const named = String(v.filename || "").trim().toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  delete v.file;
  delete v.filename;
  $("go").disabled = true;
  if (editing) {
    say("Saving…");
    try {
      if (type === "link" && !v.title) v.title = new URL(v.url).hostname;
      const r = await fetch("/api/post", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: editing.id, data: v }) });
      if (r.status === 401) return show("login");
      const out = await r.json();
      if (!r.ok) throw new Error(out.error || "Failed");
      render(type);
      say("Saved.", out.url);
      loadPosts().catch(() => {});
    } catch (err) {
      say(err.message);
    } finally {
      $("go").disabled = false;
    }
    return;
  }
  say("Posting…");
  try {
    if (type === "link" && !v.title) v.title = new URL(v.url).hostname;
    if (type === "video" && !file && !v.embed) throw new Error("Add a video file or a YouTube / Vimeo link.");
    if (type === "video" && file && v.embed) throw new Error("Pick one: a file or a link.");
    if (!v.embed) delete v.embed;
    let posterFile = null;
    if (type === "video" && file) {
      say("Checking video…");
      posterFile = await probeVideo(file); // throws if this browser can't read the format
    }
    if (file) {
      const f = type === "photo" ? await shrink(file) : file;
      if (type === "audio" && !v.title) v.title = f.name.replace(/\.[^.]+$/, "");
      const ext = (f.name.match(/\.[^.]+$/) || [""])[0].toLowerCase();
      const blob = await upload(`kg/${named ? named + ext : f.name}`, f, {
        clientPayload: named ? "clean" : "",
        access: "public",
        handleUploadUrl: "/api/upload",
        multipart: f.size > 50e6,
        onUploadProgress: ({ percentage }) => say(`Uploading ${Math.round(percentage)}%`),
      });
      v.src = blob.url;
      if (posterFile) {
        const pb = await upload(`kg/${(named || f.name.replace(/\.[^.]+$/, "")).replace(/[^\w-]+/g, "-")}-poster.jpg`, posterFile, { access: "public", handleUploadUrl: "/api/upload", clientPayload: "" });
        v.poster = pb.url;
      }
    }
    const r = await fetch("/api/post", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, data: v }) });
    if (r.status === 401) return show("login");
    const out = await r.json();
    if (!r.ok) throw new Error(out.error || "Failed");
    render(type);
    say("Posted.", out.url);
    loadPosts().catch(() => {});
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

// "Your posts": newest first, two-tap delete (no browser pop-up). Deleting also removes the post's uploaded files.
async function loadPosts() {
  const r = await fetch("/api/export");
  if (!r.ok) return;
  const posts = await r.json();
  $("posts").hidden = !posts.length;
  $("list").replaceChildren(
    ...posts.map((p) => {
      const d = p.data;
      const text = String(d.title || d.caption || d.text || d.body || d.url || d.embed || p.type).slice(0, 80);
      const row = Object.assign(document.createElement("div"), { className: "row" });
      const label = document.createElement("span");
      label.append(text, Object.assign(document.createElement("small"), { textContent: `${p.type} · ${new Date(p.date).toLocaleDateString()}` }));
      const b = Object.assign(document.createElement("button"), { type: "button", textContent: "Delete" });
      let timer;
      b.onclick = async () => {
        if (!b.classList.contains("sure")) {
          b.classList.add("sure");
          b.textContent = "Tap again to delete";
          timer = setTimeout(() => { b.classList.remove("sure"); b.textContent = "Delete"; }, 4000);
          return;
        }
        clearTimeout(timer);
        b.disabled = true;
        b.textContent = "Deleting…";
        const x = await fetch("/api/post", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: p.id }) });
        if (x.ok) { row.remove(); $("posts").hidden = !$("list").children.length; }
        else { b.disabled = false; b.classList.remove("sure"); b.textContent = "Delete"; say((await x.json().catch(() => ({}))).error || "Delete failed"); }
      };
      const ed = Object.assign(document.createElement("button"), { type: "button", textContent: "Edit" });
      ed.onclick = () => { render(p.type, p); scrollTo({ top: 0 }); };
      row.append(label, ed, b);
      return row;
    })
  );
}

async function start() {
  const r = await fetch("/api/me");
  if (!r.ok) return show("login");
  show("compose");
  loadPosts().catch(() => {});
  intake().catch(() => {});
}

navigator.serviceWorker?.register("/admin/sw.js", { scope: "/admin/" });
start();
