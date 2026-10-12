import {
  SHELF_KEY,
  compileChapters,
  makeBetaCode,
  paginateManuscript,
  parseShelf,
  removeEdition,
  serializeShelf,
  upsertEdition,
  type ShelfEdition,
  type ShelfState,
} from "@pagina/domain";
import { publishEdition, unpublishEdition } from "@pagina/supabase";
import type { Book } from "./books";
import { coverArt } from "./Cover";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";

export function loadShelf(): ShelfState {
  if (typeof localStorage === "undefined") return parseShelf(null);
  return parseShelf(localStorage.getItem(SHELF_KEY));
}

export function saveShelf(state: ShelfState) {
  localStorage.setItem(SHELF_KEY, serializeShelf(state));
}

export type PublishResult = {
  edition: ShelfEdition;
  cloudError: string | null;
};

export async function publishBookToShelf(
  book: Book,
  visibility: "public" | "beta",
  ownerId?: string | null,
): Promise<PublishResult> {
  const chapters = compileChapters(book.chapters);
  const pages = paginateManuscript(
    book.chapters.map((chapter) => ({
      title: chapter.title,
      body: chapter.body,
      scenes: chapter.scenes,
    })),
  );
  const previous = loadShelf().editions.find((item) => item.bookId === book.id);
  const edition: ShelfEdition = {
    id: previous?.id ?? book.published?.editionId ?? crypto.randomUUID(),
    bookId: book.id,
    title: book.title,
    penName: book.penName,
    pitch: book.pitch,
    coverHue: book.cover.hue,
    coverImage: book.cover.image,
    publishedAt: Date.now(),
    visibility,
    betaCode: previous?.betaCode ?? book.published?.betaCode ?? makeBetaCode(book.title),
    chapters,
    pages,
    genre: book.genres?.[0] || undefined,
    tags: book.tags?.length ? book.tags : undefined,
    mature: book.mature,
    complete: book.status === "fechado",
  };
  saveShelf(upsertEdition(loadShelf(), edition));

  let cloudError: string | null = null;

  if (isSupabaseConfigured && ownerId) {
    const remote = await publishEdition(supabase, {
      ownerId,
      manuscriptId: book.id,
      editionId: edition.id,
      workId: undefined,
      title: book.title,
      authors: book.penName ? [book.penName] : [],
      coverUrl: coverArt(book),
      visibility,
      betaCode: edition.betaCode,
      pages,
      chapters,
    });
    if (remote.edition) {
      edition.id = remote.edition.id;
      edition.publishedAt = Date.parse(remote.edition.published_at) || edition.publishedAt;
      saveShelf(upsertEdition(loadShelf(), edition));
    } else {
      cloudError = remote.error ?? "A publicação na cloud falhou.";
    }
  } else if (isSupabaseConfigured && !ownerId) {
    cloudError = "Entra na conta para publicar na cloud (senão fica só neste browser).";
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("inklyst:shelf-updated", { detail: { editionId: edition.id } }),
    );
  }

  return { edition, cloudError };
}

export async function unpublishBookFromShelf(bookId: string) {
  saveShelf(removeEdition(loadShelf(), bookId));
  if (isSupabaseConfigured) {
    await unpublishEdition(supabase, bookId);
  }
}

/** Same-origin Reader deep link (unified shell). */
export function readAppUrl(editionId?: string) {
  if (typeof window === "undefined") {
    return editionId ? `/?space=reader&edition=${editionId}` : "/?space=reader";
  }
  const url = new URL(window.location.href);
  url.searchParams.set("space", "reader");
  if (editionId) url.searchParams.set("edition", editionId);
  else url.searchParams.delete("edition");
  return `${url.pathname}${url.search}`;
}

export function openInReader(editionId: string) {
  window.dispatchEvent(
    new CustomEvent("inklyst:open-reader-edition", { detail: { editionId } }),
  );
}
