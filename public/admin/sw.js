// Receives items shared from Android's share menu. The page can't read a POST directly,
// so this stashes the shared item in a cache and redirects to the composer, which reads it.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "POST" || new URL(request.url).pathname !== "/admin/share") return;

  event.respondWith(
    (async () => {
      const form = await request.formData();
      await caches.delete("shared");
      const cache = await caches.open("shared");
      const file = form.getAll("media").find((f) => f instanceof File); // one item per post: first file wins
      if (file) {
        await cache.put("/shared/file-0", new Response(file, { headers: { "content-type": file.type, "x-name": encodeURIComponent(file.name) } }));
      }
      await cache.put("/shared/meta", Response.json({ title: form.get("title") || "", text: form.get("text") || "", url: form.get("url") || "" }));
      return Response.redirect("/admin/?shared=1", 303);
    })()
  );
});
