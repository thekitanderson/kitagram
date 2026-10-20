import { allPosts } from "../lib/db.js";
import { isAuthed } from "../lib/auth.js";
import { json } from "../lib/http.js";

// One-tap backup of every post. Files stay in Blob; this holds the posts that point to them.
async function handler(request) {
  if (!isAuthed(request)) return json({ error: "Not signed in" }, 401);
  return new Response(JSON.stringify(await allPosts(), null, 2), {
    headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="posts-backup.json"' },
  });
}

export default { fetch: handler };
