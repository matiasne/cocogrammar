import { sql } from "drizzle-orm";
import { db } from "@/db";
import { distillations } from "@/db/schema";
import type { Analysis } from "@/lib/schemas";

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-3-lite";

/**
 * Embed text via Voyage AI. Embeddings are default-ON and required, so this
 * throws when VOYAGE_API_KEY is missing or the API call fails — the caller
 * surfaces that as a 500.
 */
export async function embed(text: string): Promise<number[]> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) {
    throw new Error("VOYAGE_API_KEY is not set (embeddings are required)");
  }

  const r = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: text,
      input_type: "document",
    }),
  });

  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Voyage embedding failed (${r.status}): ${body}`);
  }

  const json = (await r.json()) as { data: { embedding: number[] }[] };
  const embedding = json.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("Voyage response did not contain an embedding");
  }
  return embedding;
}

/**
 * Build a compact "signature" of a distillation that captures the learner's
 * error *patterns* (not the raw essay), so similar recurring mistakes cluster
 * together in vector space.
 */
export function distillationSignature(analysis: Analysis): string {
  const mistakeLines = analysis.mistakes
    .map((m) => `${m.category}: ${m.explanation}`)
    .join("\n");
  return [analysis.grammarNotes, mistakeLines].filter(Boolean).join("\n");
}

export type NeighborRow = {
  id: string;
  grammarNotes: string;
  mistakes: unknown;
  distance: number;
};

/**
 * Find the nearest stored distillations for a user by cosine distance (pgvector
 * `<=>`), scoped to that user. Used by the course agent to surface recurring
 * error clusters.
 */
export async function cosineSearch(
  userId: string,
  queryEmbedding: number[],
  limit: number,
): Promise<NeighborRow[]> {
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;
  const rows = await db
    .select({
      id: distillations.id,
      grammarNotes: distillations.grammarNotes,
      mistakes: distillations.mistakes,
      distance: sql<number>`${distillations.embedding} <=> ${vectorLiteral}::vector`,
    })
    .from(distillations)
    .where(sql`${distillations.userId} = ${userId}`)
    .orderBy(sql`${distillations.embedding} <=> ${vectorLiteral}::vector`)
    .limit(limit);

  return rows as NeighborRow[];
}
