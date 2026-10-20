import { isAuthed } from "../lib/auth.js";
import { json } from "../lib/http.js";

function handler(request) {
  return isAuthed(request) ? json({ ok: true }) : json({ error: "Not signed in" }, 401);
}

export default { fetch: handler };
