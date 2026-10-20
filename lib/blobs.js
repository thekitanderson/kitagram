import { del } from "@vercel/blob";

// Files this post owns in our Blob store (never seed files, never other sites' URLs).
export function blobUrls(data) {
  const out = new Set();
  for (const k of ["src", "poster", "cover"]) {
    try {
      const u = new URL(data?.[k] || "");
      if (u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com")) out.add(u.href);
    } catch {}
  }
  return [...out];
}

export async function deleteFiles(urls) {
  if (urls.length) await del(urls);
}
