import type { PaginaClient } from "./client";

export async function listChapterTranslations(client: PaginaClient, chapterIds: string[]) {
  if (!chapterIds.length) return [];
  const { data, error } = await client
    .from("chapter_translations")
    .select("*")
    .in("chapter_id", chapterIds);
  if (error) return [];
  return data ?? [];
}

export async function upsertChapterTranslation(
  client: PaginaClient,
  input: {
    id?: string;
    chapterId: string;
    locale: string;
    body: string;
    status?: "machine_draft" | "author_confirmed";
  },
) {
  const { data, error } = await client
    .from("chapter_translations")
    .upsert(
      {
        id: input.id,
        chapter_id: input.chapterId,
        locale: input.locale,
        body: input.body,
        status: input.status ?? "machine_draft",
      },
      { onConflict: "chapter_id,locale" },
    )
    .select("*")
    .single();
  return { translation: data, error: error?.message ?? null };
}

export async function confirmTranslationRpc(client: PaginaClient, translationId: string) {
  const { data, error } = await client.rpc("confirm_translation", { p_id: translationId });
  return { translation: data, error: error?.message ?? null };
}
