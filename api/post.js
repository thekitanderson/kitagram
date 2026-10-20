import { addPost, deletePost } from "../lib/db.js";
import { isAuthed } from "../lib/auth.js";
import { json, readJson } from "../lib/http.js";

// Field rules per type: [kind, max length, required]
//   s = text, m = media (https URL or same-site path), h = http(s) link
const SPEC = {
  text: { title: ["s", 200], body: ["s", 20000, 1] },
  photo: { src: ["m", 2000, 1], alt: ["s", 500], caption: ["s", 2000] },
  quote: { text: ["s", 5000, 1], source: ["s", 300] },
  link: { url: ["h", 2000, 1], title: ["s", 300, 1], note: ["s", 2000] },
  audio: { src: ["m", 2000, 1], title: ["s", 300, 1], artist: ["s", 300] },
  video: { src: ["m", 2000, 1], caption: ["s", 2000] },
};

const isHttp = (v) => { try { return /^https?:$/.test(new URL(v).protocol); } catch { return false; } };

// Returns only the known fields, trimmed, or null if anything is missing or invalid.
function clean(type, d) {
  if (!Object.hasOwn(SPEC, type) || !d || typeof d !== "object") return null;
  const out = {};
  for (const [k, [kind, max, required]] of Object.entries(SPEC[type])) {
    const v = typeof d[k] === "string" ? d[k].trim() : "";
    if (!v) { if (required) return null; continue; }
    if (v.length > max) return null;
    if (kind === "m" && !/^(https:\/\/|\/(?!\/))/.test(v)) return null;
    if (kind === "h" && !isHttp(v)) return null;
    out[k] = v;
  }
  return out;
}

async function handler(request) {
  if (!isAuthed(request)) return json({ error: "Not signed in" }, 401);
  const body = await readJson(request);
  if (!body) return json({ error: "Bad request" }, 400);

  if (request.method === "DELETE") {
    return (await deletePost(body.id)) ? json({ ok: true }) : json({ error: "Not found" }, 404);
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const data = clean(body.type, body.data);
  if (!data) return json({ error: "Invalid post" }, 400);
  const id = await addPost(body.type, data);
  return json({ id, url: `/p/${id}` }, 201);
}

export default { fetch: handler };
