import config from "../site.config.js";

// Two install manifests. Default: the composer (share_target puts it in Android's share menu).
// ?site=1: the public site, for readers who want a home-screen shortcut.
function handler(request) {
  const icon = (n) => ({ src: `/admin/icon-${n}.png`, sizes: `${n}x${n}`, type: "image/png", purpose: "any maskable" });
  const base = { name: config.name, short_name: config.name, display: "standalone", background_color: config.iconBg, theme_color: config.theme.light.bg, icons: [icon(192), icon(512)] };
  if (new URL(request.url).searchParams.has("site")) {
    return Response.json({ ...base, id: "/", start_url: "/", scope: "/" }, { headers: { "content-type": "application/manifest+json" } });
  }
  return Response.json(
    {
      name: config.name,
      short_name: config.name,
      start_url: "/admin/",
      scope: "/admin/",
      display: "standalone",
      background_color: config.iconBg,
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
