// Sample posts for local preview only (`npm run seed`). Never shipped to production data.
export default [
  { type: "photo", date: "2026-10-08T07:30:00Z", data: { src: "/seed/photo-1.svg", alt: "Seed photo, dawn gradient", caption: "The first post." } },
  {
    type: "text",
    date: "2026-10-10T12:00:00Z",
    data: { title: "What this is", body: "A showcase on a domain I own. No accounts, no counters, nothing that follows you around.\n\nYou came here on purpose. That's the whole design." },
  },
  { type: "photo", date: "2026-10-12T08:00:00Z", data: { src: "/seed/photo-2.svg", alt: "Seed photo, dusk gradient", caption: "Square, one per post, short caption." } },
  { type: "quote", date: "2026-10-14T20:45:00Z", data: { text: "Going to a place to see something is a different act than having it shoved at you.", source: "Seed quote" } },
  { type: "link", date: "2026-10-16T14:00:00Z", data: { url: "https://en.wikipedia.org/wiki/Tumblelog", title: "Tumblelog", note: "Where the format came from." } },
  { type: "audio", date: "2026-10-18T09:10:00Z", data: { src: "/seed/tone.wav", title: "A440, three seconds", artist: "Seed Data", cover: "/seed/cover.svg" } },
  { type: "video", date: "2026-10-19T17:30:00Z", data: { src: "/seed/clip.mp4", poster: "/seed/clip-poster.svg", caption: "Three seconds of test pattern. Real footage goes here." } },
];
