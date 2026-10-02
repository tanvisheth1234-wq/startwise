// scripts/check-ownership.mjs   (SHARED, no dependencies)
// Fails if a t1/ branch touches a T2 or SHARED file, and the other way round (longest prefix wins).
import { execSync } from "node:child_process";
import fs from "node:fs";

const sh = (cmd) => execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();

const map = JSON.parse(fs.readFileSync("ownership.json", "utf8"));
const branch = process.env.GITHUB_HEAD_REF || sh("git rev-parse --abbrev-ref HEAD");
const who = branch.startsWith("t1/") ? "T1" : branch.startsWith("t2/") ? "T2" :
  branch.startsWith("shared/") ? "SHARED" : null;
if (!who) { console.log(`Branch "${branch}" has no t1/ t2/ shared/ prefix, skipping.`); process.exit(0); }

// Compare against origin/main; fall back to local main when there is no remote yet.
let base = process.env.BASE_REF || "origin/main";
try { sh(`git rev-parse --verify ${base}`); } catch { base = "main"; }

const files = sh(`git diff --name-only ${base}...HEAD`).split(/\r?\n/).filter(Boolean);
const ownerOf = (f) => {
  let best = null, len = -1;
  for (const [o, list] of Object.entries(map)) for (const p of list)
    if ((f === p || f.startsWith(p)) && p.length > len) { best = o; len = p.length; }
  return best;
};
const bad = files.filter((f) => ownerOf(f) !== who);
if (bad.length) {
  console.error(`✖ ${who} branch touches files it does not own:`);
  for (const f of bad) console.error(`   ${f}   (owner: ${ownerOf(f) ?? "UNMAPPED – add it to ownership.json"})`);
  process.exit(1);
}
console.log(`✔ ${files.length} changed file(s), all owned by ${who}`);
