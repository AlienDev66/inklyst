import {
  SHELF_KEY,
  findEditionByCode,
  parseShelf,
  serializeShelf,
  visibleEditions,
  type ShelfEdition,
  type ShelfNote,
  type ShelfState,
} from "@pagina/domain";

const UNLOCKED_KEY = "inklyst.shelf.unlocked";

export function loadShelf(): ShelfState {
  if (typeof localStorage === "undefined") return parseShelf(null);
  return parseShelf(localStorage.getItem(SHELF_KEY));
}

export function saveShelf(state: ShelfState) {
  localStorage.setItem(SHELF_KEY, serializeShelf(state));
}

export function loadUnlocked(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function saveUnlocked(ids: string[]) {
  localStorage.setItem(UNLOCKED_KEY, JSON.stringify(ids));
}

export function unlockWithCode(code: string): ShelfEdition | null {
  const shelf = loadShelf();
  const edition = findEditionByCode(shelf, code);
  if (!edition) return null;
  const unlocked = new Set(loadUnlocked());
  unlocked.add(edition.id);
  saveUnlocked([...unlocked]);
  return edition;
}

export function listReadableEditions(): ShelfEdition[] {
  return visibleEditions(loadShelf(), loadUnlocked());
}

export function addMarginNote(input: {
  editionId: string;
  author: string;
  anchorPage: number;
  body: string;
}): ShelfNote {
  const note: ShelfNote = {
    id: crypto.randomUUID(),
    editionId: input.editionId,
    author: input.author,
    anchorPage: input.anchorPage,
    body: input.body.trim(),
    at: Date.now(),
  };
  const shelf = loadShelf();
  saveShelf({ ...shelf, notes: [note, ...shelf.notes] });
  return note;
}

export function notesForEdition(editionId: string): ShelfNote[] {
  return loadShelf()
    .notes.filter((note) => note.editionId === editionId)
    .sort((a, b) => a.anchorPage - b.anchorPage || b.at - a.at);
}
