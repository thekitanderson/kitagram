// Hands the signed-in browser a one-time token so large files go straight to Blob.
// (Vercel Functions reject request bodies over 4.5 MB, so uploads can't pass through here.)
import { handleUpload } from "@vercel/blob/client";
import { isAuthed } from "../lib/auth.js";
import { json } from "../lib/http.js";

const TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "audio/flac",
  "video/mp4", "video/webm", "video/quicktime",
];

async function handler(request) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    return json(
      await handleUpload({
        body: await request.json(),
        request,
        onBeforeGenerateToken: async (_path, clientPayload) => {
          if (!isAuthed(request)) throw new Error("Not signed in");
          return { allowedContentTypes: TYPES, maximumSizeInBytes: 500 * 1024 * 1024, addRandomSuffix: clientPayload !== "clean" };
        },
      })
    );
  } catch (e) {
    return json({ error: e.message }, 400);
  }
}

export default { fetch: handler };
