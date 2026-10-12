import type { ShelfEdition } from "@pagina/domain";
import {
  acceptPairByCode,
  createReadingPair,
  fetchCircleRanks,
  findEditionByCode,
  followUser,
  getEditionById,
  grantXp,
  insertMarginNote,
  insertProcessPost,
  insertProgressMark,
  listMyPairs,
  listReadableEditions,
  loadPairRoom,
  uploadPagePhoto,
  type PublishedEdition,
  type ReadingPairRow,
} from "@pagina/supabase";
import { supabase } from "../../../lib/supabase";

function asPages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

export function editionFromRemote(row: PublishedEdition): ShelfEdition {
  const authors = row.work_authors ?? [];
  return {
    id: row.id,
    bookId: row.manuscript_id ?? row.work_id,
    title: row.work_title || "Sem título",
    penName: authors[0] ?? "",
    pitch: "",
    coverHue: 262,
    coverImage: row.work_cover_url ?? undefined,
    publishedAt: Date.parse(row.published_at) || Date.now(),
    visibility: row.visibility,
    betaCode: row.beta_code,
    chapters: Array.isArray(row.chapters) ? (row.chapters as ShelfEdition["chapters"]) : [],
    pages: asPages(row.pages),
  };
}

export async function loadCloudEditions(): Promise<ShelfEdition[]> {
  const rows = await listReadableEditions(supabase);
  return rows.map(editionFromRemote);
}

export async function unlockCloudEdition(code: string): Promise<ShelfEdition | null> {
  const row = await findEditionByCode(supabase, code);
  return row ? editionFromRemote(row) : null;
}

export async function loadCloudEdition(id: string): Promise<ShelfEdition | null> {
  const row = await getEditionById(supabase, id);
  return row ? editionFromRemote(row) : null;
}

export async function loadEditionForWork(workId: string): Promise<ShelfEdition | null> {
  const { data } = await supabase
    .from("edition_snapshots")
    .select("*, works(title, authors, cover_url, page_count)")
    .eq("work_id", workId)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const work = data.works as unknown as {
    title: string;
    authors: string[];
    cover_url: string | null;
    page_count: number | null;
  } | null;
  const { works: _w, ...edition } = data as typeof data & { works: unknown };
  return editionFromRemote({
    ...(edition as PublishedEdition),
    work_title: work?.title ?? "",
    work_authors: work?.authors ?? [],
    work_cover_url: work?.cover_url ?? null,
    work_page_count: work?.page_count ?? null,
  });
}

export async function ensurePairForEdition(
  edition: ShelfEdition,
  userId: string,
): Promise<{ pair: ReadingPairRow; inviteCode: string } | null> {
  const remote = await getEditionById(supabase, edition.id);
  if (!remote) return null;

  const pairs = await listMyPairs(supabase, userId);
  const existing = pairs.find((pair) => pair.work_id === remote.work_id && pair.status !== "ended");
  if (existing) {
    if (existing.status === "pending" && existing.inviter_id === userId) {
      const { pair } = await acceptPairByCode(supabase, existing.invite_code, userId);
      if (pair) return { pair, inviteCode: pair.invite_code };
    }
    return { pair: existing, inviteCode: existing.invite_code };
  }

  const { pair, error } = await createReadingPair(supabase, {
    workId: remote.work_id,
    inviterId: userId,
  });
  if (error || !pair) return null;
  const activated = await acceptPairByCode(supabase, pair.invite_code, userId);
  return activated.pair
    ? { pair: activated.pair, inviteCode: activated.pair.invite_code }
    : { pair, inviteCode: pair.invite_code };
}

export async function joinPair(code: string, userId: string) {
  return acceptPairByCode(supabase, code, userId);
}

export async function roomState(pair: ReadingPairRow, userId: string) {
  return loadPairRoom(supabase, pair, userId);
}

export async function checkInPage(input: {
  pairId: string;
  userId: string;
  page: number;
  title: string;
  source?: "manual" | "photo";
  photoPath?: string | null;
}) {
  const mark = await insertProgressMark(supabase, {
    pairId: input.pairId,
    userId: input.userId,
    page: input.page,
    source: input.source ?? "manual",
    photoPath: input.photoPath,
  });
  if (mark.error) return { error: mark.error };
  await grantXp(supabase, "showed_up");
  await insertProcessPost(supabase, {
    authorId: input.userId,
    kind: "reading_check_in",
    title: input.title,
    page: input.page,
    visibility: "pair",
  });
  return { error: null };
}

export async function postMarginNote(input: {
  pairId: string;
  userId: string;
  page: number;
  body: string;
}) {
  return insertMarginNote(supabase, {
    pairId: input.pairId,
    authorId: input.userId,
    anchorPage: input.page,
    body: input.body,
  });
}

export async function confirmPaperPage(input: {
  pairId: string;
  userId: string;
  page: number;
  file: File;
  title: string;
}) {
  const uploaded = await uploadPagePhoto(supabase, input.pairId, input.userId, input.file);
  if (uploaded.error || !uploaded.path) return { error: uploaded.error ?? "upload failed" };
  return checkInPage({
    pairId: input.pairId,
    userId: input.userId,
    page: input.page,
    title: input.title,
    source: "photo",
    photoPath: uploaded.path,
  });
}

export async function loadCircle() {
  return fetchCircleRanks(supabase);
}

/** Segue por UUID ou display_name exacto (profiles). */
export async function followSomeone(followerId: string, target: string) {
  const trimmed = target.trim();
  if (!trimmed) return { error: "Indica um ID ou nome." };
  if (trimmed === followerId) return { error: "Não podes seguir-te a ti." };

  let followeeId = trimmed;
  const looksLikeUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trimmed,
    );
  if (!looksLikeUuid) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("display_name", trimmed)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data?.id) return { error: "Perfil não encontrado. Usa o ID ou o nome exacto." };
    followeeId = data.id;
  }

  return followUser(supabase, followerId, followeeId);
}
