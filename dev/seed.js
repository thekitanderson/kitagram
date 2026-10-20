// Fills the LOCAL database with sample posts so the feed has something in it.
process.env.LOCAL_DB ??= ".data/pglite";
const { addPost, listPosts } = await import("../lib/db.js");
const { default: seed } = await import("./posts-seed.js");

if ((await listPosts(1)).posts.length) {
  console.log("Local database already has posts. Delete .data/ to start over.");
} else {
  for (const p of seed) await addPost(p.type, p.data, p.date);
  console.log(`Added ${seed.length} sample posts.`);
}
process.exit(0);
