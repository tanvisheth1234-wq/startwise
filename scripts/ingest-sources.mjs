// scripts/ingest-sources.mjs — `npm run sources:ingest`
// Loads the official source texts in data/sources/*.txt into the `sources` table, splits them into
// chunks, embeds each chunk with Gemini (768 numbers) and stores them in `source_chunks` (pgvector).
// The "Ask anything" box answers ONLY from these chunks.
import { readFileSync, readdirSync } from "node:fs";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

// Only sources whose text was taken from the official page and checked by the team.
const SOURCES = {
  fssai_foscos: { title: "FSSAI – Kind of Business: licence/registration criteria (updated 01.04.2026)", url: "https://foscos.fssai.gov.in/assets/docs/Revised_2ndApril2026KindofBusinessEligibility.pdf", publisher: "Food Safety and Standards Authority of India" },
  udyam: { title: "Udyam Registration portal", url: "https://udyamregistration.gov.in", publisher: "Ministry of MSME, Government of India" },
  standup: { title: "Stand-Up India", url: "https://www.standupmitra.in", publisher: "SIDBI / Government of India" },
  mudra: { title: "Pradhan Mantri MUDRA Yojana", url: "https://www.mudra.org.in", publisher: "MUDRA / Government of India" },
};
const VERIFIED_ON = "2026-10-04";
const CHUNK = 900;
const OVERLAP = 150;

const keys = [process.env.AI_API_KEY, process.env.AI_API_KEY_2].filter(Boolean);
const model = process.env.AI_EMBED_MODEL || "gemini-embedding-001";

function chunk(text) {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
  const out = [];
  for (let i = 0; i < clean.length; i += CHUNK - OVERLAP) {
    const piece = clean.slice(i, i + CHUNK).trim();
    if (piece.length > 80) out.push(piece);
  }
  return out;
}

async function embed(texts) {
  let last;
  for (const key of keys) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ requests: texts.map((t) => ({ model: `models/${model}`, content: { parts: [{ text: t }] }, taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: 768 })) }),
    });
    if (res.ok) {
      const { embeddings } = await res.json();
      return embeddings.map(({ values }) => {
        const n = Math.hypot(...values) || 1;
        return values.map((x) => x / n);
      });
    }
    last = `${res.status} ${(await res.text()).slice(0, 200)}`;
  }
  throw new Error(`embedding failed: ${last}`);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
try {
  const files = readdirSync("data/sources").filter((f) => f.endsWith(".txt"));
  for (const file of files) {
    const key = file.replace(/\.txt$/, "");
    const meta = SOURCES[key];
    if (!meta) {
      console.log(`skip ${file} (not a reviewed source)`);
      continue;
    }
    const text = readFileSync(`data/sources/${file}`, "utf8");
    const [src] = await sql`
      insert into sources (key, title, url, publisher, last_verified, status, content)
      values (${key}, ${meta.title}, ${meta.url}, ${meta.publisher}, ${VERIFIED_ON}, 'verified', ${text})
      on conflict (key) do update set title = excluded.title, url = excluded.url, publisher = excluded.publisher,
        last_verified = excluded.last_verified, status = excluded.status, content = excluded.content, updated_at = now()
      returning id`;
    await sql`delete from source_chunks where source_id = ${src.id}`;
    const pieces = chunk(`${meta.title}\n${text}`);
    for (let i = 0; i < pieces.length; i += 50) {
      const batch = pieces.slice(i, i + 50);
      const vectors = await embed(batch);
      for (const [j, content] of batch.entries()) {
        await sql`insert into source_chunks (source_id, chunk_index, content, embedding)
                  values (${src.id}, ${i + j}, ${content}, ${`[${vectors[j].join(",")}]`}::vector)`;
      }
    }
    console.log(`${key}: ${pieces.length} chunks`);
  }
} finally {
  await sql.end();
}
