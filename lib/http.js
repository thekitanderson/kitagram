export const json = (obj, status = 200, headers = {}) => Response.json(obj, { status, headers });

// Only JSON bodies are accepted. A forged cross-site form can't send one, which blocks forged posts.
export async function readJson(request) {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  return request.json().catch(() => null);
}
