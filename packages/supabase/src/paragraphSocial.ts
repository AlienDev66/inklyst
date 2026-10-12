import type { PaginaClient } from "./client";

export type ParagraphCommentRow = {
  id: string;
  edition_id: string;
  page: number;
  paragraph: number;
  author_id: string;
  body: string;
  created_at: string;
};

export type ParagraphReactionRow = {
  edition_id: string;
  page: number;
  paragraph: number;
  user_id: string;
  reaction: string;
  created_at: string;
};

export async function listParagraphComments(
  client: PaginaClient,
  editionId: string,
  page: number,
) {
  const { data, error } = await client
    .from("paragraph_comments")
    .select("*")
    .eq("edition_id", editionId)
    .eq("page", page)
    .order("created_at", { ascending: true });
  if (error || !data) return [] as ParagraphCommentRow[];
  return data as ParagraphCommentRow[];
}

export async function insertParagraphComment(
  client: PaginaClient,
  input: {
    editionId: string;
    page: number;
    paragraph: number;
    authorId: string;
    body: string;
  },
) {
  const { data, error } = await client
    .from("paragraph_comments")
    .insert({
      edition_id: input.editionId,
      page: input.page,
      paragraph: input.paragraph,
      author_id: input.authorId,
      body: input.body.trim(),
    })
    .select("*")
    .single();
  if (error) return { comment: null as ParagraphCommentRow | null, error: error.message };
  return { comment: data as ParagraphCommentRow, error: null };
}

export async function listParagraphReactions(
  client: PaginaClient,
  editionId: string,
  page: number,
) {
  const { data, error } = await client
    .from("paragraph_reactions")
    .select("*")
    .eq("edition_id", editionId)
    .eq("page", page);
  if (error || !data) return [] as ParagraphReactionRow[];
  return data as ParagraphReactionRow[];
}

export async function upsertParagraphReaction(
  client: PaginaClient,
  input: {
    editionId: string;
    page: number;
    paragraph: number;
    userId: string;
    reaction: string;
  },
) {
  const { error } = await client.from("paragraph_reactions").upsert({
    edition_id: input.editionId,
    page: input.page,
    paragraph: input.paragraph,
    user_id: input.userId,
    reaction: input.reaction,
  });
  return { error: error?.message ?? null };
}

export async function getEditionFile(
  client: PaginaClient,
  workId: string,
) {
  const { data, error } = await client
    .from("edition_files")
    .select("*")
    .eq("work_id", workId)
    .maybeSingle();
  if (error || !data) return null;
  return data as {
    id: string;
    work_id: string;
    licensee: string | null;
    storage_path: string | null;
  };
}
