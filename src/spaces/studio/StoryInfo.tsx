import {
  STORY_GENRES,
  STORY_TYPE_LABEL,
  type Book,
  type StoryType,
} from "./books";

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
          placeholder="Em poucas linhas: do que é a história? Sem spoilers."
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
        <legend>Que tipo de história é?</legend>
        <div className="story-type-row">
          {(Object.keys(STORY_TYPE_LABEL) as StoryType[]).map((type) => (
            <button
              key={type}
              type="button"
              className={(book.storyType ?? "fiction") === type ? "chip on" : "chip"}
              onClick={() => onChange({ storyType: type })}
            >
              {STORY_TYPE_LABEL[type]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Géneros (até 3)</legend>
        <div className="story-type-row">
          {STORY_GENRES.map((genre) => {
            const on = genres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                className={on ? "chip on" : "chip"}
                onClick={() => {
                  if (on) {
                    onChange({ genres: genres.filter((g) => g !== genre) });
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
          placeholder="Separadas por espaço — ex.: margem luanda suspense"
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
