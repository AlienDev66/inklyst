import type { LibraryStatus } from "@pagina/supabase";

const KEY = "inklyst.library.v1";
const LISTS_KEY = "inklyst.lists.v1";
const REVIEWS_KEY = "inklyst.reviews.v1";
const IDEAS_KEY = "inklyst.ideas.v1";
const COMMENTS_KEY = "inklyst.para_comments.v1";
const REACTIONS_KEY = "inklyst.para_reactions.v1";

export type LocalLibraryEntry = {
  editionId: string;
  status: LibraryStatus;
  page: number;
  paragraph: number;
  updatedAt: number;
};

export type LocalList = {
  id: string;
  title: string;
  description: string;
  editionIds: string[];
  createdAt: number;
};

export type LocalReview = {
  id: string;
  editionId: string;
  rating: number;
  body: string;
  createdAt: number;
};

export type LocalIdea = {
  id: string;
  body: string;
  sourceEditionId?: string;
  sourceTitle: string;
  sourceExcerpt: string;
  createdAt: number;
};

export type LocalParaComment = {
  id: string;
  editionId: string;
  page: number;
  paragraph: number;
  author: string;
  body: string;
  createdAt: number;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getLibraryMap(): Record<string, LocalLibraryEntry> {
  return readJson(KEY, {});
}

export function setLibraryEntry(entry: LocalLibraryEntry) {
  const map = getLibraryMap();
  map[entry.editionId] = entry;
  writeJson(KEY, map);
}

export function libraryByStatus(status: LibraryStatus) {
  return Object.values(getLibraryMap())
    .filter((item) => item.status === status)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function listLocalLists(): LocalList[] {
  return readJson(LISTS_KEY, [] as LocalList[]).sort((a, b) => b.createdAt - a.createdAt);
}

export function createLocalList(title: string, description = "") {
  const list: LocalList = {
    id: `list-${Date.now()}`,
    title: title.trim(),
    description: description.trim(),
    editionIds: [],
    createdAt: Date.now(),
  };
  writeJson(LISTS_KEY, [list, ...listLocalLists()]);
  return list;
}

export function addEditionToLocalList(listId: string, editionId: string) {
  const lists = listLocalLists().map((list) => {
    if (list.id !== listId) return list;
    if (list.editionIds.includes(editionId)) return list;
    return { ...list, editionIds: [...list.editionIds, editionId] };
  });
  writeJson(LISTS_KEY, lists);
}

export function listLocalReviews(editionId?: string) {
  const all = readJson(REVIEWS_KEY, [] as LocalReview[]);
  return editionId ? all.filter((item) => item.editionId === editionId) : all;
}

export function upsertLocalReview(input: { editionId: string; rating: number; body: string }) {
  const all = listLocalReviews().filter((item) => item.editionId !== input.editionId);
  const review: LocalReview = {
    id: `rev-${Date.now()}`,
    editionId: input.editionId,
    rating: input.rating,
    body: input.body.trim(),
    createdAt: Date.now(),
  };
  writeJson(REVIEWS_KEY, [review, ...all]);
  return review;
}

export function listLocalIdeas() {
  return readJson(IDEAS_KEY, [] as LocalIdea[]).sort((a, b) => b.createdAt - a.createdAt);
}

export function addLocalIdea(input: Omit<LocalIdea, "id" | "createdAt">) {
  const idea: LocalIdea = { ...input, id: `idea-${Date.now()}`, createdAt: Date.now() };
  writeJson(IDEAS_KEY, [idea, ...listLocalIdeas()]);
  return idea;
}

export function listLocalParaComments(editionId: string, page: number) {
  return readJson(COMMENTS_KEY, [] as LocalParaComment[]).filter(
    (item) => item.editionId === editionId && item.page === page,
  );
}

export function addLocalParaComment(input: Omit<LocalParaComment, "id" | "createdAt">) {
  const comment: LocalParaComment = {
    ...input,
    id: `pc-${Date.now()}`,
    createdAt: Date.now(),
  };
  const all = readJson(COMMENTS_KEY, [] as LocalParaComment[]);
  writeJson(COMMENTS_KEY, [...all, comment]);
  return comment;
}

export function countLocalParaComments(editionId: string, page: number) {
  const map = new Map<number, number>();
  for (const item of listLocalParaComments(editionId, page)) {
    map.set(item.paragraph, (map.get(item.paragraph) ?? 0) + 1);
  }
  return map;
}

export function listLocalReactions(editionId: string, page: number) {
  return readJson(REACTIONS_KEY, [] as { editionId: string; page: number; paragraph: number; reaction: string; userId: string }[]).filter(
    (item) => item.editionId === editionId && item.page === page,
  );
}

export function setLocalReaction(input: {
  editionId: string;
  page: number;
  paragraph: number;
  reaction: string;
  userId: string;
}) {
  const all = readJson(REACTIONS_KEY, [] as typeof input[]);
  const next = all.filter(
    (item) =>
      !(
        item.editionId === input.editionId &&
        item.page === input.page &&
        item.paragraph === input.paragraph &&
        item.userId === input.userId
      ),
  );
  next.push(input);
  writeJson(REACTIONS_KEY, next);
}
