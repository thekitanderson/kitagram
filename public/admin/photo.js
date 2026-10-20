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
