// Re-encodes a photo at a sensible size. Re-encoding also strips EXIF data, including GPS location.
export async function shrink(file, max = 2000) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * s), height: Math.round(bmp.height * s) });
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.88));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

// Loads a video locally to prove this browser can play it, and grabs a poster frame.
// Rejects with a plain message when the format (often iPhone HEVC .mov) can't be read.
export function probeVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = Object.assign(document.createElement("video"), { muted: true, playsInline: true, preload: "auto", src: url });
    const done = (fn, x) => { URL.revokeObjectURL(url); fn(x); };
    const bad = () => done(reject, new Error("This phone/browser can't read that video format. Convert it to MP4 (H.264), or post a YouTube/Vimeo link."));
    const timer = setTimeout(() => done(resolve, null), 15000); // slow device: skip the poster, still post
    v.onerror = () => { clearTimeout(timer); bad(); };
    v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 0) / 4); };
    v.onseeked = () => {
      clearTimeout(timer);
      if (!v.videoWidth) return bad();
      const s = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
      const c = Object.assign(document.createElement("canvas"), { width: Math.round(v.videoWidth * s), height: Math.round(v.videoHeight * s) });
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      c.toBlob((b) => done(resolve, b ? new File([b], "poster.jpg", { type: "image/jpeg" }) : null), "image/jpeg", 0.85);
    };
  });
}
