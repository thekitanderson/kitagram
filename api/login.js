import { checkPassword, sessionCookie } from "../lib/auth.js";
import { json, readJson } from "../lib/http.js";

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await readJson(request);
  if (!checkPassword(body?.password)) {
    await new Promise((r) => setTimeout(r, 1000)); // slows password guessing
    return json({ error: "Wrong password" }, 401);
  }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie() });
}
