import type { PaginaClient } from "./client";
import type { Json } from "./types";

export async function upsertManuscriptExtras(
  client: PaginaClient,
  manuscriptId: string,
  payload: Json,
) {
  const { error } = await client.from("manuscript_extras").upsert(
    {
      manuscript_id: manuscriptId,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "manuscript_id" },
  );
  return { error: error?.message ?? null };
}

export async function loadManuscriptExtras(
  client: PaginaClient,
  manuscriptIds: string[],
): Promise<Record<string, Json>> {
  if (!manuscriptIds.length) return {};
  const { data, error } = await client
    .from("manuscript_extras")
    .select("manuscript_id, payload")
    .in("manuscript_id", manuscriptIds);
  if (error || !data) return {};
  const map: Record<string, Json> = {};
  for (const row of data) map[row.manuscript_id] = row.payload;
  return map;
}
