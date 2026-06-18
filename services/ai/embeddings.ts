import { db } from "@/lib/db";
import { embed } from "./client";

export async function generateAndStoreEmbedding(params: {
  userId: string;
  itemType: string;
  itemId: string;
  content: string;
}): Promise<void> {
  const { userId, itemType, itemId, content } = params;
  if (!content.trim()) return;

  const vector = await embed(content);
  if (!vector) return;

  const vectorLiteral = `[${vector.join(",")}]`;

  await db.$executeRaw`
    INSERT INTO "SearchIndex" (id, "userId", "itemType", "itemId", content, embedding, "createdAt")
    VALUES (
      gen_random_uuid()::text,
      ${userId},
      ${itemType},
      ${itemId},
      ${content},
      ${vectorLiteral}::vector,
      now()
    )
    ON CONFLICT ("userId", "itemType", "itemId")
    DO UPDATE SET
      content = EXCLUDED.content,
      embedding = EXCLUDED.embedding::vector
  `;
}

type SearchRow = {
  itemType: string;
  itemId: string;
  content: string;
  similarity: number;
};

export async function searchByVector(params: {
  userId: string;
  query: string;
  itemTypes?: string[];
  limit?: number;
}): Promise<SearchRow[]> {
  const { userId, query, limit = 10 } = params;
  const itemTypes = params.itemTypes;

  const vector = await embed(query);
  if (!vector) return [];

  const vectorLiteral = `[${vector.join(",")}]`;

  if (itemTypes && itemTypes.length > 0) {
    return db.$queryRaw<SearchRow[]>`
      SELECT
        "itemType",
        "itemId",
        content,
        1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "SearchIndex"
      WHERE
        "userId" = ${userId}
        AND "itemType" = ANY(${itemTypes}::text[])
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `;
  }

  return db.$queryRaw<SearchRow[]>`
    SELECT
      "itemType",
      "itemId",
      content,
      1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM "SearchIndex"
    WHERE
      "userId" = ${userId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `;
}

export async function searchEmails(params: {
  userId: string;
  query: string;
  limit?: number;
}): Promise<Array<{ itemId: string; content: string; similarity: number }>> {
  const results = await searchByVector({
    userId: params.userId,
    query: params.query,
    itemTypes: ["email"],
    limit: params.limit ?? 10,
  });
  return results.map((r) => ({
    itemId: r.itemId,
    content: r.content,
    similarity: r.similarity,
  }));
}

export async function searchAll(params: {
  userId: string;
  query: string;
  limit?: number;
}): Promise<SearchRow[]> {
  return searchByVector({
    userId: params.userId,
    query: params.query,
    limit: params.limit ?? 15,
  });
}