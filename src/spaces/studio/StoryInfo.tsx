import {
  STORY_TYPE_LABEL,
  type Book,
  type StoryType,
} from "./books";
import { ALL_STORY_TYPES, genresFor, modeOf } from "./projectMode";

const COPYRIGHTS = [
  { id: "all-rights", label: "Todos os direitos reservados" },
  { id: "cc-by", label: "Creative Commons BY" },
  { id: "public", label: "Domínio público (intencional)" },
] as const;

export function StoryInfo({
  book,
  onChange,
}: {
  book: Book;
  onChange: (patch: Partial<Book>) => void;
}) {
  const storyType = (book.storyType ?? "fiction") as StoryType;
  const project = modeOf(storyType);
  const genreOptions = genresFor(storyType);
  const genres = book.genres ?? [];
  const tagsText = (book.tags ?? []).join(" ");

  return (
    <section className="story-info">
      <header>
        <p className="eyebrow">Para o Reader</p>
        <h2>Como os leitores te vêem</h2>
        <p className="fine">Capa, título e descrição da página do livro — não o texto do manuscrito.</p>
      </header>

      <label>
        <span>Título</span>
        <input
          value={book.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </label>

      <label>
        <span>Descrição</span>
        <textarea
          rows={4}
          value={book.pitch}
          placeholder={
            storyType === "legal"
              ? "Em poucas linhas: tema, público e âmbito do livro."
              : storyType === "poetry"
                ? "O tom da colecção — sem spoilers dos poemas."
                : "Em poucas linhas: do que é a obra? Sem spoilers."
          }
          onChange={(event) => onChange({ pitch: event.target.value })}
        />
      </label>

      <label>
        <span>Idioma</span>
        <select
          value={book.language ?? "pt"}
          onChange={(event) => onChange({ language: event.target.value })}
        >
          <option value="pt">Português</option>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </label>

      <fieldset>
        <legend>Modo do projecto</legend>
        <p className="fine" style={{ marginTop: 0 }}>
          {project.blurb}
        </p>
        <div className="story-type-row">
          {ALL_STORY_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={storyType === type ? "chip on" : "chip"}
              onClick={() =>
                onChange({
                  storyType: type,
                  kind: modeOf(type).defaultKind,
                  genres: [],
                })
              }
            >
              {STORY_TYPE_LABEL[type]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Géneros (até 3)</legend>
        <div className="story-type-row">
          {genreOptions.map((genre) => {
            const on = genres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                className={on ? "chip on" : "chip"}
                onClick={() => {
                  if (on) {
                    onChange({ genres: genres.filter((item) => item !== genre) });
                    return;
                  }
                  if (genres.length >= 3) return;
                  onChange({ genres: [...genres, genre] });
                }}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label>
        <span>Tags</span>
        <input
          value={tagsText}
          placeholder="Separadas por espaço"
          onChange={(event) =>
            onChange({
              tags: event.target.value
                .split(/\s+/)
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
        />
      </label>

      <label>
        <span>Copyright</span>
        <select
          value={book.copyright ?? "all-rights"}
          onChange={(event) => onChange({ copyright: event.target.value })}
        >
          {COPYRIGHTS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="story-mature">
        <input
          type="checkbox"
          checked={Boolean(book.mature)}
          onChange={(event) => onChange({ mature: event.target.checked })}
        />
        <span>
          Conteúdo para adultos
          <small>Marca se não for para todas as idades.</small>
        </span>
      </label>
    </section>
  );
}
