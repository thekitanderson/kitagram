import config from "../site.config.js";

// The composer's install manifest. share_target puts the app in Android's share menu.
function handler() {
  const icon = (n) => ({ src: `/admin/icon-${n}.png`, sizes: `${n}x${n}`, type: "image/png", purpose: "any maskable" });
  return Response.json(
    {
      name: config.name,
      short_name: config.name,
      start_url: "/admin/",
      scope: "/admin/",
      display: "standalone",
      background_color: config.theme.light.bg,
      theme_color: config.theme.light.bg,
      icons: [icon(192), icon(512)],
      share_target: {
        action: "/admin/share",
        method: "POST",
        enctype: "multipart/form-data",
        params: { title: "title", text: "text", url: "url", files: [{ name: "media", accept: ["image/*", "audio/*", "video/*"] }] },
      },
    },
    { headers: { "content-type": "application/manifest+json" } }
  );
}

export default { fetch: handler };
