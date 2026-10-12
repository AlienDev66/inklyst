/** Shared shelf contract for published editions (Reader library / Studio publish). */

import { plainText } from "./text";

export const SHELF_KEY = "inklyst.shelf.v1";

export type ShelfChapter = {
  id: string;
  title: string;
  body: string;
};

export type ShelfEdition = {
  id: string;
  bookId: string;
  title: string;
  penName: string;
  pitch: string;
  coverHue: number;
  coverImage?: string;
  publishedAt: number;
  visibility: "public" | "beta";
  betaCode: string;
  chapters: ShelfChapter[];
  pages: string[];
  /** Discovery metadata (optional — samples and rich editions). */
  genre?: string;
  tags?: string[];
  complete?: boolean;
  mature?: boolean;
};

export type ShelfNote = {
  id: string;
  editionId: string;
  author: string;
  anchorPage: number;
  body: string;
  at: number;
};

export type ShelfInvite = {
  code: string;
  editionId: string;
  label: string;
  createdAt: number;
};

export type ShelfState = {
  editions: ShelfEdition[];
  notes: ShelfNote[];
  invites: ShelfInvite[];
};

export function emptyShelf(): ShelfState {
  return { editions: [], notes: [], invites: [] };
}

export function parseShelf(raw: string | null | undefined): ShelfState {
  if (!raw) return emptyShelf();
  try {
    const parsed = JSON.parse(raw) as Partial<ShelfState>;
    return {
      editions: Array.isArray(parsed.editions) ? parsed.editions : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      invites: Array.isArray(parsed.invites) ? parsed.invites : [],
    };
  } catch {
    return emptyShelf();
  }
}

export function serializeShelf(state: ShelfState): string {
  return JSON.stringify(state);
}

/** Split manuscript text into reader pages (~420 chars, break on paragraphs). */
export function paginateManuscript(
  chapters: { title: string; body: string; scenes?: { title: string; body: string }[] }[],
  target = 420,
): string[] {
  const blocks: string[] = [];
  for (const chapter of chapters) {
    const title = chapter.title?.trim() || "Sem título";
    blocks.push(title);
    const pieces = [
      plainText(chapter.body),
      ...(chapter.scenes ?? []).flatMap((scene) => [
        scene.title?.trim() || "Cena",
        plainText(scene.body),
      ]),
    ];
    for (const piece of pieces) {
      for (const para of String(piece || "")
        .split(/\n\n+/)
        .map((item) => item.trim())
        .filter(Boolean)) {
        blocks.push(para);
      }
    }
  }

  if (blocks.length === 0) return ["(Manuscrito vazio)"];

  const pages: string[] = [];
  let current = "";
  for (const block of blocks) {
    const next = current ? `${current}\n\n${block}` : block;
    if (current && next.length > target) {
      pages.push(current);
      current = block;
    } else {
      current = next;
    }
  }
  if (current) pages.push(current);
  return pages;
}

export function makeBetaCode(seed = ""): string {
  const base = seed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base || "BETA"}-${rand}`;
}

export function compileChapters(chapters: {
  id: string;
  title: string;
  body: string;
  scenes?: { title: string; body: string }[];
}[]): ShelfChapter[] {
  return chapters.map((chapter) => {
    const scenes = (chapter.scenes ?? [])
      .map((scene) => `${scene.title || "Sem título"}\n\n${scene.body}`.trim())
      .filter(Boolean)
      .join("\n\n");
    const body = [chapter.body.trim(), scenes].filter(Boolean).join("\n\n");
    return {
      id: chapter.id,
      title: chapter.title || "Sem título",
      body,
    };
  });
}

export function upsertEdition(state: ShelfState, edition: ShelfEdition): ShelfState {
  const editions = state.editions.filter((item) => item.bookId !== edition.bookId);
  const invites = state.invites.filter((item) => item.editionId !== edition.id);
  const nextInvites =
    edition.visibility === "beta"
      ? [
          ...invites,
          {
            code: edition.betaCode,
            editionId: edition.id,
            label: edition.title,
            createdAt: edition.publishedAt,
          },
        ]
      : invites;
  return {
    ...state,
    editions: [edition, ...editions],
    invites: nextInvites,
  };
}

export function removeEdition(state: ShelfState, bookId: string): ShelfState {
  const gone = state.editions.find((item) => item.bookId === bookId);
  if (!gone) return state;
  return {
    editions: state.editions.filter((item) => item.bookId !== bookId),
    notes: state.notes.filter((item) => item.editionId !== gone.id),
    invites: state.invites.filter((item) => item.editionId !== gone.id),
  };
}

export function findEditionByCode(state: ShelfState, code: string): ShelfEdition | null {
  const needle = code.trim().toUpperCase();
  if (!needle) return null;
  const invite = state.invites.find((item) => item.code.toUpperCase() === needle);
  if (!invite) {
    return state.editions.find((item) => item.betaCode.toUpperCase() === needle) ?? null;
  }
  return state.editions.find((item) => item.id === invite.editionId) ?? null;
}

export function visibleEditions(state: ShelfState, unlockedIds: string[]): ShelfEdition[] {
  const unlocked = new Set(unlockedIds);
  return state.editions.filter(
    (edition) => edition.visibility === "public" || unlocked.has(edition.id),
  );
}
