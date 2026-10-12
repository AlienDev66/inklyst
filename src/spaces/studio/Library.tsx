import { Bell, FolderPlus, Lightbulb, MoreHorizontal, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import {
  listLocalIdeas,
  type LocalIdea,
} from "../reader/libraryLocal";
import {
  COVER_HUES,
  KIND_LABEL,
  STORY_GENRES,
  STORY_TYPE_LABEL,
  wordsOf,
  type Book,
  type BookKind,
  type StoryType,
} from "./books";
import { coverArt, CoverFace, fileToCover } from "./Cover";
import { useBooks } from "./store";

const EMPTY = {
  title: "",
  penName: "",
  pitch: "",
  kind: "romance" as BookKind,
  hue: 332,
  image: undefined as string | undefined,
  storyType: "fiction" as StoryType,
  tags: "",
  genre: "Romance",
};

const FOLDERS_KEY = "pagina-folders-v1";

const GENRES: { name: string; line: string; kind: BookKind; grade: string }[] = [
  { name: "Romance", line: "Amor, drama e relações.", kind: "romance", grade: "sepia" },
  { name: "Thriller", line: "Mistério que prende.", kind: "romance", grade: "night" },
  { name: "Ficção", line: "Mundos sem limites.", kind: "novela", grade: "copper" },
  { name: "Não-ficção", line: "Histórias reais.", kind: "novela", grade: "moss" },
  { name: "Conto", line: "Ideias que ficam.", kind: "conto", grade: "amber" },
  { name: "Poesia", line: "Palavras que sentem.", kind: "conto", grade: "rose" },
];

function loadFolders() {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function edited(at: number) {
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return "Editado hoje";
  if (days === 1) return "Editado há 1 dia";
  if (days < 7) return `Editado há ${days} dias`;
  if (days < 14) return "Editado há 1 semana";
  return `Editado há ${Math.floor(days / 7)} semanas`;
}

function progress(book: Book) {
  const words = wordsOf(book);
  if (words <= 0) return 0;
  return Math.max(1, Math.min(100, Math.round((words / Math.max(book.targetWords, 1)) * 100)));
}

export function Library() {
  const { books, openBook, addBook, patchBook } = useBooks();
  const { user, configured } = useAuth();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const [bell, setBell] = useState(false);
  const [folders, setFolders] = useState<string[]>(loadFolders);
  const [folderName, setFolderName] = useState("");
  const [naming, setNaming] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [folderFilter, setFolderFilter] = useState("");
  const [ideas, setIdeas] = useState<LocalIdea[]>(() => listLocalIdeas());

  useEffect(() => {
    function openCreate() {
      setCreating(true);
    }
    function refreshIdeas() {
      setIdeas(listLocalIdeas());
    }
    window.addEventListener("inklyst:open-create-project", openCreate);
    window.addEventListener("inklyst:ideas-updated", refreshIdeas);
    return () => {
      window.removeEventListener("inklyst:open-create-project", openCreate);
      window.removeEventListener("inklyst:ideas-updated", refreshIdeas);
    };
  }, []);

  useEffect(() => {
    if (!configured || !isSupabaseConfigured || !user?.id) return;
    let cancelled = false;
    void import("@pagina/supabase").then(({ listWritingIdeas }) =>
      listWritingIdeas(supabase, user.id).then((rows) => {
        if (cancelled || !rows.length) return;
        const local = listLocalIdeas();
        const remote: LocalIdea[] = rows.map((row) => ({
          id: row.id,
          body: row.body,
          sourceEditionId: row.source_edition_id ?? undefined,
          sourceTitle: row.source_title,
          sourceExcerpt: row.source_excerpt,
          createdAt: new Date(row.created_at).getTime(),
        }));
        const seen = new Set(local.map((item) => item.id));
        setIdeas([...local, ...remote.filter((item) => !seen.has(item.id))]);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [configured, user?.id]);

  const needle = query.trim().toLowerCase();
  const visible = books
    .filter((book) => (folderFilter ? book.folder === folderFilter : true))
    .filter((book) => {
      if (!needle) return true;
      return [book.title, book.pitch, book.penName, book.folder ?? ""].join(" ").toLowerCase().includes(needle);
    })
    .sort((a, b) => b.openedAt - a.openedAt);

  function saveFolder(name: string) {
    const next = name.trim();
    if (!next || folders.includes(next)) return;
    const list = [...folders, next];
    setFolders(list);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(list));
    setFolderName("");
    setNaming(false);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const image = await fileToCover(file);
    setDraft((current) => ({ ...current, image }));
  }

  function startGenre(kind: BookKind, name: string) {
    setDraft({ ...EMPTY, kind, pitch: name === "Romance" || name === "Conto" ? "" : name });
    setCreating(true);
  }

  return (
    <section className="home" aria-label="Projetos" id="projetos">
      <div className="home-hero">
        <div className="home-bar">
          <label className="home-search">
            <Search size={16} />
            <input
              id="shelf-search"
              value={query}
              placeholder="Procurar projetos, notas, personagens..."
              aria-label="Procurar projetos, notas, personagens"
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>⌘K</kbd>
          </label>
          <button type="button" className="icon-btn" aria-label="Avisos" onClick={() => setBell((value) => !value)}>
            <Bell size={16} />
          </button>
          <img className="avatar" src="/avatar.jpg" alt="" />
          {bell ? <p className="bell-pop">Sem novidades.</p> : null}
        </div>
        <p className="hero-kicker">Inklyst Studio</p>
        <h1>
          {books.length === 0 ? (
            <>
              O teu primeiro
              <br />
              projeto começa aqui.
            </>
          ) : (
            <>
              Os teus
              <br />
              projetos.
            </>
          )}
        </h1>
        <p className="hero-sub">
          {books.length === 0
            ? "Imagina, escreve e publica — sem recomendações de leitura a meio do fluxo."
            : "Manuscritos, ideias e mundos. A biblioteca de leitura fica no Reader."}
        </p>
        {books.length === 0 ? (
          <div className="onboarding-cta">
            <button type="button" className="ghost-btn" onClick={() => setCreating(true)}>
              <Plus size={16} /> Criar o primeiro livro
            </button>
            <p className="fine">Ou escolhe um género em baixo para começar com forma certa.</p>
          </div>
        ) : null}
      </div>

      {creating ? (
        <form
          className="cadastro home-create"
          onSubmit={(event) => {
            event.preventDefault();
            addBook({
              title: draft.title,
              penName: draft.penName,
              pitch: draft.pitch,
              kind: draft.kind,
              cover: { hue: draft.hue, image: draft.image },
              storyType: draft.storyType,
              tags: draft.tags.split(/\s+/).map((t) => t.trim()).filter(Boolean),
              genres: draft.genre ? [draft.genre] : [],
            });
            setDraft(EMPTY);
            setCreating(false);
          }}
        >
          <label className="cover-upload">
            <CoverFace
              size="hero"
              book={{
                title: draft.title || "Sem título",
                penName: draft.penName,
                kind: draft.kind,
                cover: { hue: draft.hue, image: draft.image },
              }}
            />
            <span>{draft.image ? "Trocar a imagem da capa" : "Adicionar imagem da capa"}</span>
            <input type="file" accept="image/*" aria-label="Imagem da capa" onChange={(event) => void onFile(event.target.files?.[0])} />
          </label>
          <div className="cadastro-fields">
            <p className="eyebrow">Novo livro</p>
            <label>
              <span>Título</span>
              <input value={draft.title} autoFocus placeholder="Um título, mesmo provisório" aria-label="Título do livro" onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </label>
            <label>
              <span>Nome na capa</span>
              <input value={draft.penName} placeholder="Opcional" aria-label="Nome na capa" onChange={(event) => setDraft({ ...draft, penName: event.target.value })} />
            </label>
            <label>
              <span>Forma</span>
              <select aria-label="Forma do livro" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as BookKind })}>
                {(Object.keys(KIND_LABEL) as BookKind[]).map((kind) => (
                  <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Sinopse / descrição</span>
              <textarea value={draft.pitch} placeholder="Uma frase que te oriente. Não é o primeiro capítulo." aria-label="Sinopse do livro" onChange={(event) => setDraft({ ...draft, pitch: event.target.value })} />
            </label>
            <label>
              <span>Tipo</span>
              <select
                aria-label="Tipo de história"
                value={draft.storyType}
                onChange={(event) =>
                  setDraft({ ...draft, storyType: event.target.value as StoryType })
                }
              >
                {(Object.keys(STORY_TYPE_LABEL) as StoryType[]).map((type) => (
                  <option key={type} value={type}>{STORY_TYPE_LABEL[type]}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Género</span>
              <select
                aria-label="Género"
                value={draft.genre}
                onChange={(event) => setDraft({ ...draft, genre: event.target.value })}
              >
                {STORY_GENRES.map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Tags</span>
              <input
                value={draft.tags}
                placeholder="Separadas por espaço"
                aria-label="Tags"
                onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
              />
            </label>
            <div className="hues" role="list" aria-label="Cor da capa">
              {COVER_HUES.map((hue) => (
                <button key={hue} type="button" className={draft.hue === hue && !draft.image ? "hue on" : "hue"} style={{ background: `hsl(${hue} 34% 36%)` }} aria-label={`Cor ${hue}`} onClick={() => setDraft({ ...draft, hue, image: undefined })} />
              ))}
            </div>
            <div className="create-actions">
              <button type="submit" className="send">Abrir o livro</button>
              <button type="button" className="text-btn" onClick={() => setCreating(false)}>Voltar aos projetos</button>
            </div>
          </div>
        </form>
      ) : (
        <>
          <div className="home-row">
            <h2>Os meus projetos <span>{visible.length}</span></h2>
            <div className="home-actions">
              <button type="button" className="send" onClick={() => setCreating(true)}>
                <Plus size={15} /> Novo projeto
              </button>
              {naming ? (
                <input
                  className="folder-input"
                  autoFocus
                  aria-label="Nome da pasta"
                  placeholder="Nome da pasta"
                  value={folderName}
                  onChange={(event) => setFolderName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveFolder(folderName);
                    if (event.key === "Escape") setNaming(false);
                  }}
                  onBlur={() => saveFolder(folderName)}
                />
              ) : (
                <button type="button" className="ghost-btn" onClick={() => setNaming(true)}>
                  <FolderPlus size={15} /> Nova pasta
                </button>
              )}
            </div>
          </div>
          {folders.length > 0 ? (
            <div className="folder-row">
              <button type="button" className={folderFilter === "" ? "chip on" : "chip"} onClick={() => setFolderFilter("")}>Tudo</button>
              {folders.map((name) => (
                <button key={name} type="button" className={folderFilter === name ? "chip on" : "chip"} onClick={() => setFolderFilter(name)}>{name}</button>
              ))}
            </div>
          ) : null}
          <div className="book-grid">
            {visible.map((book) => {
              const chapter = book.chapters.find((item) => item.id === book.activeChapterId) ?? book.chapters[0];
              const index = Math.max(0, book.chapters.findIndex((item) => item.id === chapter.id));
              return (
                <article key={book.id} className="book-card">
                  <button type="button" className="book-open" onClick={() => openBook(book.id)} aria-label={`Abrir ${book.title}`}>
                    <span className="plate" style={{ backgroundImage: `url("${coverArt(book) ?? ""}")` }}>
                      <span className="plate-caption">Capítulo {index + 1} de {book.chapters.length}</span>
                      <span className="plate-bar"><i style={{ width: `${progress(book)}%` }} /></span>
                      <span className="plate-pct">{progress(book)}%</span>
                    </span>
                  </button>
                  <div className="book-meta">
                    <div>
                      <strong>{book.title}</strong>
                      <em>{KIND_LABEL[book.kind]}</em>
                      <small>{wordsOf(book).toLocaleString("pt-PT")} palavras · {edited(book.openedAt)}</small>
                    </div>
                    <button type="button" className="icon-btn" aria-label={`Opções de ${book.title}`} onClick={() => setMenu(menu === book.id ? null : book.id)}>
                      <MoreHorizontal size={16} />
                    </button>
                    {menu === book.id ? (
                      <div className="card-menu">
                        {folders.length === 0 ? <p>Cria uma pasta primeiro.</p> : folders.map((name) => (
                          <button key={name} type="button" onClick={() => { patchBook(book.id, { folder: name }); setMenu(null); }}>
                            {book.folder === name ? "Nesta pasta" : `Mover para ${name}`}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
            <button type="button" className="book-card dashed" onClick={() => setCreating(true)}>
              <span className="plus-tile"><Plus size={18} /></span>
              <strong>Novo livro</strong>
              <small>Começa uma nova história do zero.</small>
            </button>
          </div>

          <div className="home-row">
            <h2>Continuar a ler <span>{visible.length}</span></h2>
          </div>
          <div className="continue-row">
            {visible.map((book) => {
              const chapter = book.chapters.find((item) => item.id === book.activeChapterId) ?? book.chapters[0];
              return (
                <button key={book.id} type="button" className="continue-card" onClick={() => openBook(book.id)}>
                  <span className="thumb" style={{ backgroundImage: `url("${coverArt(book) ?? ""}")` }} />
                  <span>
                    <strong>{book.title}</strong>
                    <small>{chapter?.title || "Sem título"}</small>
                    <span className="mini-bar"><i style={{ width: `${progress(book)}%` }} /></span>
                  </span>
                  <em>{progress(book)}%</em>
                </button>
              );
            })}
          </div>

          <div className="home-row">
            <h2>
              <Lightbulb size={18} style={{ marginRight: 6, verticalAlign: -3 }} />
              Ideias <span>{ideas.length}</span>
            </h2>
          </div>
          {ideas.length ? (
            <ul className="ideas-list">
              {ideas.map((idea) => (
                <li key={idea.id}>
                  <p>{idea.body}</p>
                  <small>
                    {idea.sourceTitle
                      ? `Durante «${idea.sourceTitle}»`
                      : "Do Reader"}
                    {" · "}
                    {new Date(idea.createdAt).toLocaleDateString("pt-PT")}
                  </small>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      addBook({
                        title: idea.body.slice(0, 48) || "Nova ideia",
                        penName: "",
                        pitch: idea.body,
                        kind: "conto",
                        cover: { hue: 28 },
                      });
                    }}
                  >
                    Abrir no Studio
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fine" style={{ marginBottom: 24 }}>
              Quando no Reader tocares em «Inspirou-me», a ideia aparece aqui — sem copiar o texto do autor.
            </p>
          )}

          <div className="home-row">
            <h2>Modelos e inspiração <span>{GENRES.length}</span></h2>
          </div>
          <div className="genre-row">
            {GENRES.map((genre) => (
              <button key={genre.name} type="button" className={`genre ${genre.grade}`} onClick={() => startGenre(genre.kind, genre.name)}>
                <strong>{genre.name}</strong>
                <small>{genre.line}</small>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

