import type { PaginaClient } from "./client";

export type WritingIdeaRow = {
  id: string;
  owner_id: string;
  body: string;
  source_edition_id: string | null;
  source_title: string;
  source_excerpt: string;
  created_at: string;
  transformed_manuscript_id: string | null;
};

export async function insertWritingIdea(
  client: PaginaClient,
  input: {
    ownerId: string;
    body: string;
    sourceEditionId?: string;
    sourceTitle?: string;
    sourceExcerpt?: string;
  },
) {
  const { data, error } = await client
    .from("writing_ideas")
    .insert({
      owner_id: input.ownerId,
      body: input.body.trim(),
      source_edition_id: input.sourceEditionId ?? null,
      source_title: input.sourceTitle ?? "",
      source_excerpt: input.sourceExcerpt ?? "",
    })
    .select("*")
    .single();
  if (error) return { idea: null as WritingIdeaRow | null, error: error.message };
  return { idea: data as WritingIdeaRow, error: null };
}

export async function listWritingIdeas(client: PaginaClient, ownerId: string) {
  const { data, error } = await client
    .from("writing_ideas")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error || !data) return [] as WritingIdeaRow[];
  return data as WritingIdeaRow[];
}
