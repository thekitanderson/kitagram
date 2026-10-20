// One password, one signed cookie. No accounts, no auth library.
import { createHmac, timingSafeEqual } from "node:crypto";

const YEAR = 60 * 60 * 24 * 365;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET is missing or shorter than 16 characters");
  return s;
}
const sign = (v) => createHmac("sha256", secret()).update(String(v)).digest("base64url");
const same = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// Both sides are hashed first, so the comparison is constant-time and length-blind.
export function checkPassword(attempt) {
  const real = process.env.ADMIN_PASSWORD;
  return Boolean(real) && typeof attempt === "string" && same(sign(attempt), sign(real));
}

export function sessionCookie() {
  const exp = Math.floor(Date.now() / 1000) + YEAR;
  return `kg=${exp}.${sign(exp)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${YEAR}${process.env.VERCEL ? "; Secure" : ""}`;
}

export function isAuthed(request) {
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)kg=([^;]+)/);
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  return Boolean(sig) && same(sig, sign(exp)) && Number(exp) > Date.now() / 1000;
}
