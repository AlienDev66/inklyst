import type { PaginaClient } from "./client";
import type { ChapterRow, ManuscriptRow } from "./types";

export type ManuscriptWithChapters = ManuscriptRow & {
  chapters: ChapterRow[];
};

export async function listManuscripts(
  client: PaginaClient,
  ownerId: string,
): Promise<ManuscriptWithChapters[]> {
  const { data: manuscripts, error } = await client
    .from("manuscripts")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
  if (error || !manuscripts?.length) return [];

  const ids = manuscripts.map((item) => item.id);
  const { data: chapters } = await client
    .from("chapters")
    .select("*")
    .in("manuscript_id", ids)
    .order("position", { ascending: true });

  const byManuscript = new Map<string, ChapterRow[]>();
  for (const chapter of chapters ?? []) {
    const list = byManuscript.get(chapter.manuscript_id) ?? [];
    list.push(chapter);
    byManuscript.set(chapter.manuscript_id, list);
  }

  return manuscripts.map((manuscript) => ({
    ...manuscript,
    chapters: byManuscript.get(manuscript.id) ?? [],
  }));
}

export async function createManuscript(
  client: PaginaClient,
  input: {
    ownerId: string;
    title: string;
    language?: string;
    id?: string;
    firstChapter?: { id?: string; title: string; body?: string };
  },
): Promise<ManuscriptWithChapters | null> {
  const { data: manuscript, error } = await client
    .from("manuscripts")
    .insert({
      id: input.id,
      owner_id: input.ownerId,
      title: input.title,
      language: input.language ?? "pt",
    })
    .select("*")
    .single();
  if (error || !manuscript) return null;

  const { data: chapter, error: chapterError } = await client
    .from("chapters")
    .insert({
      id: input.firstChapter?.id,
      manuscript_id: manuscript.id,
      position: 1,
      title: input.firstChapter?.title ?? "Capítulo 1",
      body: input.firstChapter?.body ?? "",
    })
    .select("*")
    .single();
  if (chapterError || !chapter) return { ...manuscript, chapters: [] };
  return { ...manuscript, chapters: [chapter] };
}

export async function updateManuscriptTitle(
  client: PaginaClient,
  manuscriptId: string,
  title: string,
) {
  const { error } = await client
    .from("manuscripts")
    .update({ title })
    .eq("id", manuscriptId);
  return { error: error?.message ?? null };
}

export async function upsertChapter(
  client: PaginaClient,
  chapter: {
    id: string;
    manuscriptId: string;
    position: number;
    title: string;
    body: string;
  },
) {
  const { error } = await client.from("chapters").upsert(
    {
      id: chapter.id,
      manuscript_id: chapter.manuscriptId,
      position: chapter.position,
      title: chapter.title,
      body: chapter.body,
    },
    { onConflict: "id" },
  );
  return { error: error?.message ?? null };
}

export async function deleteChapter(client: PaginaClient, chapterId: string) {
  const { error } = await client.from("chapters").delete().eq("id", chapterId);
  return { error: error?.message ?? null };
}

export async function reorderChapters(
  client: PaginaClient,
  chapters: { id: string; manuscriptId: string; position: number; title: string; body: string }[],
) {
  const { error } = await client.from("chapters").upsert(
    chapters.map((chapter) => ({
      id: chapter.id,
      manuscript_id: chapter.manuscriptId,
      position: chapter.position,
      title: chapter.title,
      body: chapter.body,
    })),
    { onConflict: "id" },
  );
  return { error: error?.message ?? null };
}
