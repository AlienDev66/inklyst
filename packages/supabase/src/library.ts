import type { PaginaClient } from "./client";

export type LibraryStatus = "reading" | "want" | "finished";

export type ReadingProgressRow = {
  user_id: string;
  edition_id: string;
  page: number;
  paragraph: number;
  status: LibraryStatus;
  updated_at: string;
};

export async function upsertReadingProgress(
  client: PaginaClient,
  input: {
    userId: string;
    editionId: string;
    page: number;
    paragraph?: number;
    status?: LibraryStatus;
  },
): Promise<{ row: ReadingProgressRow | null; error: string | null }> {
  const payload = {
    user_id: input.userId,
    edition_id: input.editionId,
    page: Math.max(1, input.page),
    paragraph: Math.max(0, input.paragraph ?? 0),
    status: input.status ?? "reading",
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("reading_progress")
    .upsert(payload)
    .select("*")
    .single();
  if (error) return { row: null, error: error.message };
  return { row: data as ReadingProgressRow, error: null };
}

export async function listReadingProgress(
  client: PaginaClient,
  userId: string,
  status?: LibraryStatus,
): Promise<ReadingProgressRow[]> {
  let query = client
    .from("reading_progress")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as ReadingProgressRow[];
}

export async function getReadingProgress(
  client: PaginaClient,
  userId: string,
  editionId: string,
): Promise<ReadingProgressRow | null> {
  const { data, error } = await client
    .from("reading_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("edition_id", editionId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ReadingProgressRow;
}

export type BookListRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  is_public: boolean;
  created_at: string;
};

export async function listBookLists(client: PaginaClient, ownerId: string) {
  const { data, error } = await client
    .from("book_lists")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error || !data) return [] as BookListRow[];
  return data as BookListRow[];
}

export async function createBookList(
  client: PaginaClient,
  input: { ownerId: string; title: string; description?: string; isPublic?: boolean },
) {
  const { data, error } = await client
    .from("book_lists")
    .insert({
      owner_id: input.ownerId,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      is_public: input.isPublic ?? true,
    })
    .select("*")
    .single();
  if (error) return { list: null as BookListRow | null, error: error.message };
  return { list: data as BookListRow, error: null };
}

export async function addToBookList(
  client: PaginaClient,
  input: { listId: string; editionId: string; note?: string },
) {
  const { error } = await client.from("book_list_items").upsert({
    list_id: input.listId,
    edition_id: input.editionId,
    position: 1,
    note: input.note ?? "",
  });
  return { error: error?.message ?? null };
}

export type ReviewRow = {
  id: string;
  author_id: string;
  edition_id: string;
  rating: number;
  body: string;
  is_public: boolean;
  created_at: string;
};

export async function upsertReview(
  client: PaginaClient,
  input: { authorId: string; editionId: string; rating: number; body: string },
) {
  const { data, error } = await client
    .from("reviews")
    .upsert({
      author_id: input.authorId,
      edition_id: input.editionId,
      rating: input.rating,
      body: input.body.trim(),
      is_public: true,
    })
    .select("*")
    .single();
  if (error) return { review: null as ReviewRow | null, error: error.message };
  return { review: data as ReviewRow, error: null };
}

export async function listReviewsForEdition(client: PaginaClient, editionId: string) {
  const { data, error } = await client
    .from("reviews")
    .select("*")
    .eq("edition_id", editionId)
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  if (error || !data) return [] as ReviewRow[];
  return data as ReviewRow[];
}

export async function listReviewsByAuthor(client: PaginaClient, authorId: string) {
  const { data, error } = await client
    .from("reviews")
    .select("*")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  if (error || !data) return [] as ReviewRow[];
  return data as ReviewRow[];
}

export async function fetchPublicProfile(client: PaginaClient, idOrHandle: string) {
  const byId = await client.from("profiles").select("*").eq("id", idOrHandle).maybeSingle();
  if (byId.data) return byId.data;
  const { data } = await client
    .from("profiles")
    .select("*")
    .ilike("handle", idOrHandle)
    .maybeSingle();
  return data;
}

export async function updatePublicProfile(
  client: PaginaClient,
  userId: string,
  input: { displayName?: string; handle?: string; bio?: string; isPublic?: boolean },
) {
  const patch: {
    display_name?: string;
    handle?: string | null;
    bio?: string;
    is_public?: boolean;
  } = {};
  if (input.displayName !== undefined) patch.display_name = input.displayName.trim();
  if (input.handle !== undefined) patch.handle = input.handle.trim().toLowerCase() || null;
  if (input.bio !== undefined) patch.bio = input.bio.trim();
  if (input.isPublic !== undefined) patch.is_public = input.isPublic;
  const { data, error } = await client
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single();
  if (error) return { profile: null, error: error.message };
  return { profile: data, error: null };
}
