import { useMemo, useState } from "react";

const GENRES = [
  "Romance",
  "Thriller",
  "Mistério",
  "Fantasia",
  "Ficção científica",
  "Literatura contemporânea",
  "Histórico",
  "Terror",
  "Humor",
  "Poesia",
  "Não-ficção",
  "Aventura",
  "Young adult",
  "Contos",
  "Drama",
] as const;

const KEY = "inklyst.reader_genres";

export function loadGenrePrefs(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function genresDone(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(`${KEY}.done`) === "1";
}

export function markGenresDone(genres: string[]) {
  localStorage.setItem(KEY, JSON.stringify(genres));
  localStorage.setItem(`${KEY}.done`, "1");
}

export function GenreOnboarding({
  open,
  onDone,
}: {
  open: boolean;
  onDone: (genres: string[]) => void;
}) {
  const initial = useMemo(() => new Set(loadGenrePrefs()), []);
  const [picked, setPicked] = useState<Set<string>>(initial);

  if (!open) return null;

  function toggle(genre: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  }

  return (
    <div className="genre-scrim" role="dialog" aria-modal aria-labelledby="genre-title">
      <div className="genre-card">
        <h2 id="genre-title">Quais são os teus géneros favoritos?</h2>
        <p className="fine">
          Escolhe pelo menos um para personalizar o Início. Podes saltar — a plataforma continua a
          mesma.
        </p>
        <div className="genre-chips">
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              className={picked.has(genre) ? "genre-chip on" : "genre-chip"}
              aria-pressed={picked.has(genre)}
              onClick={() => toggle(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
        <div className="genre-actions">
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              markGenresDone([]);
              onDone([]);
            }}
          >
            Saltar
          </button>
          <button
            type="button"
            className="rd-btn primary"
            disabled={picked.size === 0}
            onClick={() => {
              const list = [...picked];
              markGenresDone(list);
              onDone(list);
            }}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
