import type { PaginaClient } from "./client";
import type { MarginNoteRow, ProgressMarkRow, ReadingPairRow } from "./types";

export type PairRoom = {
  pair: ReadingPairRow;
  myPage: number;
  partnerPage: number;
  partnerId: string | null;
  notes: (MarginNoteRow & { author_name: string })[];
};

export async function createReadingPair(
  client: PaginaClient,
  input: { workId: string; inviterId: string },
) {
  const { data, error } = await client
    .from("reading_pairs")
    .insert({
      work_id: input.workId,
      inviter_id: input.inviterId,
      status: "pending",
    })
    .select("*")
    .single();
  return { pair: data, error: error?.message ?? null };
}

export async function acceptPairByCode(client: PaginaClient, code: string, _userId: string) {
  const { data, error } = await client.rpc("join_pair", {
    p_code: code.trim().toUpperCase(),
  });
  return { pair: data as ReadingPairRow | null, error: error?.message ?? null };
}

export async function activateSoloPair(client: PaginaClient, pairId: string) {
  const { data, error } = await client
    .from("reading_pairs")
    .update({ status: "active" })
    .eq("id", pairId)
    .select("*")
    .single();
  return { pair: data, error: error?.message ?? null };
}

export async function listMyPairs(client: PaginaClient, userId: string) {
  const { data, error } = await client
    .from("reading_pairs")
    .select("*")
    .or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function latestPage(client: PaginaClient, pairId: string, userId: string) {
  const { data, error } = await client.rpc("latest_page", {
    p_pair: pairId,
    p_user: userId,
  });
  if (error) return 0;
  return Number(data ?? 0);
}

export async function insertProgressMark(
  client: PaginaClient,
  input: {
    pairId: string;
    userId: string;
    page: number;
    source: "manual" | "photo";
    photoPath?: string | null;
  },
) {
  const { data, error } = await client
    .from("progress_marks")
    .insert({
      pair_id: input.pairId,
      user_id: input.userId,
      page: input.page,
      source: input.source,
      photo_path: input.photoPath ?? null,
    })
    .select("*")
    .single();
  return { mark: data as ProgressMarkRow | null, error: error?.message ?? null };
}

export async function listMarginNotes(client: PaginaClient, pairId: string) {
  const { data, error } = await client
    .from("margin_notes")
    .select("*, profiles(display_name)")
    .eq("pair_id", pairId)
    .order("anchor_page", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data) return [] as (MarginNoteRow & { author_name: string })[];
  return data.map((row) => {
    const profile = row.profiles as unknown as { display_name: string } | null;
    const { profiles: _p, ...note } = row as typeof row & { profiles: unknown };
    return {
      ...(note as MarginNoteRow),
      author_name: profile?.display_name?.trim() || "Leitor",
    };
  });
}

export async function insertMarginNote(
  client: PaginaClient,
  input: { pairId: string; authorId: string; anchorPage: number; body: string },
) {
  const { data, error } = await client
    .from("margin_notes")
    .insert({
      pair_id: input.pairId,
      author_id: input.authorId,
      anchor_page: input.anchorPage,
      body: input.body.trim(),
    })
    .select("*")
    .single();
  return { note: data, error: error?.message ?? null };
}

export async function uploadPagePhoto(
  client: PaginaClient,
  pairId: string,
  userId: string,
  file: File,
) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${pairId}/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await client.storage.from("page-photos").upload(path, file, {
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  return { path: error ? null : path, error: error?.message ?? null };
}

export async function loadPairRoom(
  client: PaginaClient,
  pair: ReadingPairRow,
  userId: string,
): Promise<PairRoom> {
  const partnerId =
    pair.inviter_id === userId ? pair.invitee_id : pair.inviter_id;
  const [myPage, partnerPage, notes] = await Promise.all([
    latestPage(client, pair.id, userId),
    partnerId ? latestPage(client, pair.id, partnerId) : Promise.resolve(0),
    listMarginNotes(client, pair.id),
  ]);
  return { pair, myPage, partnerPage, partnerId, notes };
}
