// One table. Production uses DATABASE_URL (Neon). With no DATABASE_URL, local dev
// falls back to PGlite (Postgres in-process), so `npm run dev` needs no setup.
let ready;

function init() {
  return (ready ??= (async () => {
    let query;
    if (process.env.DATABASE_URL) {
      const { default: pg } = await import("pg");
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
      query = (sql, params) => pool.query(sql, params);
    } else {
      // Never fall back to the throwaway local database in production: posts would silently vanish.
      if (process.env.VERCEL) throw new Error("DATABASE_URL is not set. Add a Neon Postgres database to this Vercel project.");
      const { PGlite } = await import("@electric-sql/pglite");
      const dir = process.env.LOCAL_DB ?? "memory://";
      if (!dir.startsWith("memory:")) (await import("node:fs")).mkdirSync(dir, { recursive: true });
      const db = new PGlite(dir);
      query = (sql, params) => db.query(sql, params);
    }
    await query(
      "create table if not exists posts (id serial primary key, type text not null, date timestamptz not null default now(), data jsonb not null)"
    );
    return query;
  })().catch((e) => {
    ready = undefined; // a failed start must not stick to a warm instance
    throw e;
  }));
}

const shape = (r) => ({ id: String(r.id), type: r.type, date: new Date(r.date).toISOString(), data: r.data });
const isId = (id) => /^\d{1,9}$/.test(String(id));

export async function listPosts(limit, offset = 0) {
  const q = await init();
  const { rows } = await q("select * from posts order by date desc, id desc limit $1 offset $2", [limit + 1, offset]);
  return { posts: rows.slice(0, limit).map(shape), more: rows.length > limit };
}

export async function allPosts() {
  const q = await init();
  const { rows } = await q("select * from posts order by date desc, id desc");
  return rows.map(shape);
}

export async function getPost(id) {
  if (!isId(id)) return null;
  const q = await init();
  const { rows } = await q("select * from posts where id = $1", [id]);
  return rows[0] ? shape(rows[0]) : null;
}

export async function addPost(type, data, date) {
  const q = await init();
  const { rows } = await q("insert into posts (type, data, date) values ($1, $2, coalesce($3::timestamptz, now())) returning id", [type, JSON.stringify(data), date ?? null]);
  return String(rows[0].id);
}

export async function deletePost(id) {
  if (!isId(id)) return false;
  const q = await init();
  const { rows } = await q("delete from posts where id = $1 returning id", [id]);
  return rows.length > 0;
}
