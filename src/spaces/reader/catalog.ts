import type { ShelfEdition } from "@pagina/domain";

/** Browse categories — adapted from discovery platforms, Inklyst tone. */
export const BROWSE_GENRES = [
  "Romance",
  "Thriller",
  "Fantasia",
  "Ficção",
  "Não-ficção",
  "Conto",
  "Poesia",
  "Mistério",
  "Terror",
  "Aventura",
  "Drama",
  "Histórico",
] as const;

export type BrowseGenre = (typeof BROWSE_GENRES)[number];

export const SENSATION_CHIPS: { label: string; genre: BrowseGenre }[] = [
  { label: "Romance", genre: "Romance" },
  { label: "Tensão", genre: "Thriller" },
  { label: "Mundos", genre: "Fantasia" },
  { label: "Emocional", genre: "Drama" },
];

export function editionGenre(edition: ShelfEdition): string {
  return edition.genre || "Ficção";
}

export function editionsByGenre(editions: ShelfEdition[], genre: string) {
  const needle = genre.toLowerCase();
  return editions.filter((item) => {
    const g = editionGenre(item).toLowerCase();
    const tags = (item.tags ?? []).map((t) => t.toLowerCase());
    return g === needle || tags.some((t) => t.includes(needle) || needle.includes(t));
  });
}

export function alsoLike(editions: ShelfEdition[], current: ShelfEdition, limit = 6) {
  const genre = editionGenre(current).toLowerCase();
  const scored = editions
    .filter((item) => item.id !== current.id)
    .map((item) => {
      let score = 0;
      if (editionGenre(item).toLowerCase() === genre) score += 3;
      for (const tag of current.tags ?? []) {
        if ((item.tags ?? []).some((t) => t.toLowerCase() === tag.toLowerCase())) score += 2;
      }
      if (item.penName && item.penName === current.penName) score += 1;
      return { item, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  const picks = scored.map((row) => row.item);
  if (picks.length >= limit) return picks.slice(0, limit);
  const rest = editions.filter(
    (item) => item.id !== current.id && !picks.some((p) => p.id === item.id),
  );
  return [...picks, ...rest].slice(0, limit);
}

export function formatParts(edition: ShelfEdition) {
  const n = edition.chapters?.length || 0;
  if (n === 1) return "1 parte";
  if (n > 0) return `${n} partes`;
  return `${edition.pages.length} páginas`;
}
