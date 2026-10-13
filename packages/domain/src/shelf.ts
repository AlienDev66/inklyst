/** Shared shelf contract for published editions (Reader library / Studio publish). */

import { plainText } from "./text";

export const SHELF_KEY = "inklyst.shelf.v1";

export type ShelfChapter = {
  id: string;
  title: string;
  body: string;
};

/** How the Reader should set the page — mirrors Studio project modes. */
export type ReadingMode = "fiction" | "fanfic" | "poetry" | "prose" | "nonfiction" | "legal";

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
  /** Studio project mode — drives Reader typography. */
  storyType?: ReadingMode;
  kind?: string;
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
  options?: { verse?: boolean },
): string[] {
  const verse = Boolean(options?.verse);
  const blocks: string[] = [];
  for (const chapter of chapters) {
    const title = chapter.title?.trim() || "Sem título";
    blocks.push(title);
    const pieces = [
      plainText(chapter.body),
      ...(chapter.scenes ?? []).flatMap((scene) => [
        scene.title?.trim() || (verse ? "Estrofe" : "Cena"),
        plainText(scene.body),
      ]),
    ];
    for (const piece of pieces) {
      const raw = String(piece || "").replace(/\r\n/g, "\n").trim();
      if (!raw) continue;
      if (verse) {
        // Keep stanza breaks; do not collapse single newlines into one prose blob.
        for (const stanza of raw.split(/\n\s*\n/).map((item) => item.trimEnd()).filter(Boolean)) {
          blocks.push(stanza);
        }
      } else {
        for (const para of raw
          .split(/\n\n+/)
          .map((item) => item.trim())
          .filter(Boolean)) {
          blocks.push(para);
        }
      }
    }
  }

  if (blocks.length === 0) return ["(Manuscrito vazio)"];

  const pages: string[] = [];
  let current = "";
  const joiner = verse ? "\n\n" : "\n\n";
  const limit = verse ? Math.max(target, 520) : target;
  for (const block of blocks) {
    const next = current ? `${current}${joiner}${block}` : block;
    if (current && next.length > limit) {
      pages.push(current);
      current = block;
    } else {
      current = next;
    }
  }
  if (current) pages.push(current);
  return pages;
}

/** Infer Reader typography mode from stored metadata or genre labels. */
export function readingModeOf(edition: Pick<ShelfEdition, "storyType" | "genre" | "kind" | "tags">): ReadingMode {
  if (edition.storyType) return edition.storyType;
  const bag = [edition.genre, edition.kind, ...(edition.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/poes|poem|lírica|lirica|verso|soneto|haiku|slam/.test(bag)) return "poetry";
  if (/direito|juríd|jurid|doutrina|código|codigo|artigo|tese/.test(bag)) return "legal";
  if (/crónica|cronica|ensaio|prosa|memória|memoria|diário|diario/.test(bag)) return "prose";
  if (/não-ficção|nao-ficcao|nonfiction|biografia|manual|história|historia/.test(bag)) {
    return "nonfiction";
  }
  if (/fanfic|fan-fic/.test(bag)) return "fanfic";
  return "fiction";
}

/** Chapters payload may be a bare array (legacy) or `{ storyType, kind, items }`. */
export function parseEditionChapters(raw: unknown): {
  chapters: ShelfChapter[];
  storyType?: ReadingMode;
  kind?: string;
  genre?: string;
  tags?: string[];
} {
  if (Array.isArray(raw)) {
    return { chapters: raw as ShelfChapter[] };
  }
  if (raw && typeof raw === "object") {
    const data = raw as Record<string, unknown>;
    const items = Array.isArray(data.items) ? (data.items as ShelfChapter[]) : [];
    const storyType =
      typeof data.storyType === "string" ? (data.storyType as ReadingMode) : undefined;
    return {
      chapters: items,
      storyType,
      kind: typeof data.kind === "string" ? data.kind : undefined,
      genre: typeof data.genre === "string" ? data.genre : undefined,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
    };
  }
  return { chapters: [] };
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
