// YouTube / Vimeo links -> privacy-friendly player URLs (no cookies until played). Anything else is rejected.
export function embedOf(link) {
  let u;
  try { u = new URL(link); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^(www|m)\./, "");
  const id = (s) => (/^[\w-]{6,20}$/.test(s || "") ? s : null);
  if (host === "youtu.be") {
    const v = id(u.pathname.slice(1));
    return v && { src: `https://www.youtube-nocookie.com/embed/${v}`, poster: `https://i.ytimg.com/vi/${v}/hqdefault.jpg` };
  }
  if (host === "youtube.com" || host === "music.youtube.com") {
    const v = id(u.searchParams.get("v") || u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1]);
    return v && { src: `https://www.youtube-nocookie.com/embed/${v}`, poster: `https://i.ytimg.com/vi/${v}/hqdefault.jpg` };
  }
  if (host === "vimeo.com") {
    const m = u.pathname.match(/^\/(\d+)(?:\/([0-9a-f]+))?\/?$/);
    return m && { src: `https://player.vimeo.com/video/${m[1]}?dnt=1${m[2] ? `&h=${m[2]}` : ""}`, poster: null };
  }
  return null;
}
