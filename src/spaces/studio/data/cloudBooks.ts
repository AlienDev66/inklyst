import { parseAdvisorNote } from "@pagina/domain";
import {
  createManuscript,
  deleteChapter,
  listManuscripts,
  reorderChapters,
  updateManuscriptTitle,
  upsertChapter,
  type ManuscriptWithChapters,
} from "@pagina/supabase";
import {
  blankBook,
  chapterCloudBody,
  coverFor,
  type Book,
  type Chapter,
} from "../books";
import { supabase } from "../../../lib/supabase";
import { applyExtras, loadExtrasMap } from "./cloudExtras";

function chapterFromRow(
  row: ManuscriptWithChapters["chapters"][number],
  extras?: Partial<Chapter>,
): Chapter {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    synopsis: extras?.synopsis ?? "",
    notes: extras?.notes ?? "",
    status: extras?.status ?? "rascunho",
    label: extras?.label ?? "cena",
    partId: extras?.partId ?? null,
    scenes: extras?.scenes ?? [],
    activeSceneId: extras?.activeSceneId ?? null,
    snapshots: extras?.snapshots ?? [],
    advisor: extras?.advisor,
  };
}

export function bookFromManuscript(
  manuscript: ManuscriptWithChapters,
  previous?: Book,
): Book {
  const chapters = manuscript.chapters.map((row) => {
    const prior = previous?.chapters.find((item) => item.id === row.id);
    return chapterFromRow(row, prior);
  });
  const activeChapterId =
    previous?.activeChapterId && chapters.some((item) => item.id === previous.activeChapterId)
      ? previous.activeChapterId
      : chapters[0]?.id ?? crypto.randomUUID();

  if (previous) {
    return {
      ...previous,
      id: manuscript.id,
      title: manuscript.title,
      chapters: chapters.length
        ? chapters
        : previous.chapters,
      activeChapterId,
      savedAt: Date.now(),
    };
  }

  const seed = blankBook({
    title: manuscript.title,
    penName: "",
    pitch: "",
    kind: "novela",
    cover: coverFor(manuscript.id),
  });

  return {
    ...seed,
    id: manuscript.id,
    title: manuscript.title,
    chapters: chapters.length
      ? chapters
      : [
          {
            ...seed.chapters[0],
            id: activeChapterId,
          },
        ],
    activeChapterId,
    advisor: parseAdvisorNote({
      kind: "question",
      prompt: "O que é que este livro ainda não te deixou escrever?",
    }),
    openedAt: Date.now(),
    savedAt: Date.now(),
  };
}

export async function loadCloudBooks(ownerId: string, previous: Book[] = []): Promise<Book[]> {
  const rows = await listManuscripts(supabase, ownerId);
  if (!rows.length) return [];
  const extras = await loadExtrasMap(rows.map((row) => row.id));
  return rows.map((row) =>
    applyExtras(
      bookFromManuscript(
        row,
        previous.find((book) => book.id === row.id),
      ),
      extras[row.id],
    ),
  );
}

export async function createCloudBook(
  ownerId: string,
  draft: {
    title: string;
    penName: string;
    pitch: string;
    kind: Book["kind"];
    cover: Book["cover"];
    storyType?: Book["storyType"];
    tags?: string[];
    genres?: string[];
    language?: string;
    copyright?: string;
    mature?: boolean;
  },
): Promise<Book | null> {
  const local = blankBook(draft);
  const created = await createManuscript(supabase, {
    ownerId,
    title: local.title,
    id: local.id,
    firstChapter: {
      id: local.chapters[0].id,
      title: local.chapters[0].title,
      body: local.chapters[0].body,
    },
  });
  if (!created) return null;
  return bookFromManuscript(created, local);
}

export async function syncManuscriptTitle(bookId: string, title: string) {
  return updateManuscriptTitle(supabase, bookId, title);
}

export async function syncChapter(book: Book, chapterId: string) {
  const index = book.chapters.findIndex((item) => item.id === chapterId);
  const chapter = book.chapters[index];
  if (!chapter || index < 0) return { error: "chapter missing" };
  return upsertChapter(supabase, {
    id: chapter.id,
    manuscriptId: book.id,
    position: index + 1,
    title: chapter.title,
    body: chapterCloudBody(chapter),
  });
}

export async function syncAllChapterPositions(book: Book) {
  return reorderChapters(
    supabase,
    book.chapters.map((chapter, index) => ({
      id: chapter.id,
      manuscriptId: book.id,
      position: index + 1,
      title: chapter.title,
      body: chapterCloudBody(chapter),
    })),
  );
}

export async function syncDeleteChapter(chapterId: string) {
  return deleteChapter(supabase, chapterId);
}

export async function syncNewChapter(book: Book, chapter: Chapter, position: number) {
  return upsertChapter(supabase, {
    id: chapter.id,
    manuscriptId: book.id,
    position,
    title: chapter.title,
    body: chapterCloudBody(chapter),
  });
}
