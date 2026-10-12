import type { PaginaClient } from "./client";
import type { EditionSnapshotRow, Json } from "./types";

export type PublishedEdition = EditionSnapshotRow & {
  work_title: string;
  work_authors: string[];
  work_cover_url: string | null;
  work_page_count: number | null;
};

export async function publishEdition(
  client: PaginaClient,
  input: {
    ownerId: string;
    manuscriptId: string;
    editionId?: string;
    workId?: string;
    title: string;
    authors: string[];
    coverUrl?: string | null;
    visibility: "public" | "beta";
    betaCode: string;
    pages: string[];
    chapters: Json;
  },
) {
  let workId = input.workId ?? null;
  let editionId = input.editionId;

  if (!workId || !editionId) {
    const { data: existing } = await client
      .from("edition_snapshots")
      .select("id, work_id")
      .eq("manuscript_id", input.manuscriptId)
      .maybeSingle();
    if (existing) {
      workId = workId ?? existing.work_id;
      editionId = editionId ?? existing.id;
    }
  }

  if (workId) {
    const { error: workError } = await client
      .from("works")
      .update({
        title: input.title,
        authors: input.authors,
        cover_url: input.coverUrl ?? null,
        page_count: input.pages.length || null,
      })
      .eq("id", workId);
    if (workError) return { error: workError.message, edition: null, workId: null };
  } else {
    const { data: work, error: workError } = await client
      .from("works")
      .insert({
        title: input.title,
        authors: input.authors,
        cover_url: input.coverUrl ?? null,
        page_count: input.pages.length || null,
        language: "pt",
      })
      .select("id")
      .single();
    if (workError || !work) return { error: workError?.message ?? "work refused", edition: null, workId: null };
    workId = work.id;
  }

  const row = {
    work_id: workId,
    manuscript_id: input.manuscriptId,
    owner_id: input.ownerId,
    visibility: input.visibility,
    beta_code: input.betaCode,
    pages: input.pages,
    chapters: input.chapters,
    published_at: new Date().toISOString(),
  };

  const query = editionId
    ? client.from("edition_snapshots").update(row).eq("id", editionId).select("*").single()
    : client.from("edition_snapshots").insert(row).select("*").single();

  const { data: edition, error } = await query;
  return { error: error?.message ?? null, edition: edition ?? null, workId };
}

export async function unpublishEdition(client: PaginaClient, manuscriptId: string) {
  const { error } = await client
    .from("edition_snapshots")
    .delete()
    .eq("manuscript_id", manuscriptId);
  return { error: error?.message ?? null };
}

export async function listReadableEditions(client: PaginaClient): Promise<PublishedEdition[]> {
  const { data, error } = await client
    .from("edition_snapshots")
    .select("*, works(title, authors, cover_url, page_count)")
    .order("published_at", { ascending: false });
  if (error || !data) return [];

  return data.map((row) => {
    const work = row.works as unknown as {
      title: string;
      authors: string[];
      cover_url: string | null;
      page_count: number | null;
    } | null;
    const { works: _w, ...edition } = row as typeof row & { works: unknown };
    return {
      ...(edition as EditionSnapshotRow),
      work_title: work?.title ?? "",
      work_authors: work?.authors ?? [],
      work_cover_url: work?.cover_url ?? null,
      work_page_count: work?.page_count ?? null,
    };
  });
}

export async function findEditionByCode(client: PaginaClient, code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const { data, error } = await client.rpc("unlock_edition", { p_code: normalized });
  if (error || !data) return null;
  const edition = data as EditionSnapshotRow;
  const { data: work } = await client
    .from("works")
    .select("title, authors, cover_url, page_count")
    .eq("id", edition.work_id)
    .maybeSingle();
  return {
    ...edition,
    work_title: work?.title ?? "",
    work_authors: work?.authors ?? [],
    work_cover_url: work?.cover_url ?? null,
    work_page_count: work?.page_count ?? null,
  } satisfies PublishedEdition;
}

export async function getEditionById(client: PaginaClient, id: string) {
  const { data, error } = await client
    .from("edition_snapshots")
    .select("*, works(title, authors, cover_url, page_count)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const work = data.works as unknown as {
    title: string;
    authors: string[];
    cover_url: string | null;
    page_count: number | null;
  } | null;
  const { works: _w, ...edition } = data as typeof data & { works: unknown };
  return {
    ...(edition as EditionSnapshotRow),
    work_title: work?.title ?? "",
    work_authors: work?.authors ?? [],
    work_cover_url: work?.cover_url ?? null,
    work_page_count: work?.page_count ?? null,
  } satisfies PublishedEdition;
}
