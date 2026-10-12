import type { PaginaClient } from "./client";

export async function grantXp(client: PaginaClient, kind: string) {
  const { data, error } = await client.rpc("grant_xp", { p_kind: kind });
  return { event: data, error: error?.message ?? null };
}

export async function insertProcessPost(
  client: PaginaClient,
  input: {
    authorId: string;
    kind: "reading_check_in" | "writing_session";
    title: string;
    page?: number | null;
    wordCount?: number | null;
    visibility?: "pair" | "followers" | "public";
  },
) {
  const { data, error } = await client
    .from("process_posts")
    .insert({
      author_id: input.authorId,
      kind: input.kind,
      title: input.title,
      page: input.page ?? null,
      word_count: input.wordCount ?? null,
      visibility: input.visibility ?? "followers",
    })
    .select("*")
    .single();
  return { post: data, error: error?.message ?? null };
}

export async function fetchCircleRanks(client: PaginaClient) {
  const { data, error } = await client.from("circle_ranks").select("user_id, xp");
  if (error || !data) return [] as { userId: string; xp: number; name: string }[];

  const ids = data.map((row) => row.user_id);
  const { data: profiles } = ids.length
    ? await client.from("profiles").select("id, display_name").in("id", ids)
    : { data: [] as { id: string; display_name: string }[] };

  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  return data
    .map((row) => ({
      userId: row.user_id,
      xp: Number(row.xp ?? 0),
      name: names.get(row.user_id)?.trim() || "Leitor",
    }))
    .sort((a, b) => b.xp - a.xp);
}

export async function followUser(client: PaginaClient, followerId: string, followeeId: string) {
  const { error } = await client.from("follows").insert({
    follower_id: followerId,
    followee_id: followeeId,
  });
  return { error: error?.message ?? null };
}
