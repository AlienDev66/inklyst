const KEY = "inklyst.reading_progress.v1";

export type ReadingProgress = {
  editionId: string;
  page: number;
  /** 0-based paragraph within the page */
  paragraph: number;
  updatedAt: number;
};

type Store = Record<string, ReadingProgress>;

function loadStore(): Store {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Store) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStore(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function getProgress(editionId: string): ReadingProgress | null {
  return loadStore()[editionId] ?? null;
}

export function saveProgress(input: {
  editionId: string;
  page: number;
  paragraph?: number;
}) {
  const page = Math.max(1, Math.floor(input.page));
  const paragraph = Math.max(0, Math.floor(input.paragraph ?? 0));
  const store = loadStore();
  store[input.editionId] = {
    editionId: input.editionId,
    page,
    paragraph,
    updatedAt: Date.now(),
  };
  saveStore(store);
}

export function progressLabel(editionId: string, totalPages: number): string | null {
  const progress = getProgress(editionId);
  if (!progress || totalPages <= 0) return null;
  const page = Math.min(progress.page, totalPages);
  const pct = Math.max(1, Math.min(100, Math.round((page / totalPages) * 100)));
  return `Página ${page} · ${pct}%`;
}

export function mostRecentProgress(
  editions: { id: string }[],
): ReadingProgress | null {
  const store = loadStore();
  let best: ReadingProgress | null = null;
  for (const edition of editions) {
    const item = store[edition.id];
    if (!item) continue;
    if (!best || item.updatedAt > best.updatedAt) best = item;
  }
  return best;
}
