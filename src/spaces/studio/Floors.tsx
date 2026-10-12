import { countWords, plainText, writingStats } from "@pagina/domain";
import {
  ArrowRight,
  BookOpen,
  ChartColumn,
  Eye,
  NotebookPen,
  Search,
  Target,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import { KIND_LABEL, wordsOf, type Book } from "./books";
import { coverArt, CoverFace } from "./Cover";
import { openInReader } from "./shelfStore";
import { useBooks } from "./store";

const RICH_BODY_RE = /<\/?(?:b|i|u|em|strong|a|ul|ol|li|div|br|p|span)\b/i;

function safeRichHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function PreviewBody({ body, empty }: { body: string; empty: string }) {
  const content = body.trim();
  if (!content) return <div className="preview-body"><p>{empty}</p></div>;
  if (RICH_BODY_RE.test(content)) {
    return (
      <div
        className="preview-body rich"
        dangerouslySetInnerHTML={{ __html: safeRichHtml(content) }}
      />
    );
  }
  return (
    <div className="preview-body">
      {plainText(content)
        .split(/\n\n+/)
        .filter(Boolean)
        .map((block, index) => (
          <p key={index}>{block}</p>
        ))}
    </div>
  );
}

function progress(book: Book) {
  const words = wordsOf(book);
  if (words <= 0) return 0;
  return Math.max(1, Math.min(100, Math.round((words / Math.max(book.targetWords, 1)) * 100)));
}

function FloorPage({
  kicker,
  title,
  sub,
  metrics,
  children,
}: {
  kicker: string;
  title: string;
  sub: string;
  metrics?: { label: string; value: string; hint: string }[];
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <section className="floor" aria-label={kicker}>
      <header className="floor-hero">
        <motion.div
          className="floor-hero-copy"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="hero-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p className="hero-sub">{sub}</p>
        </motion.div>
        {metrics?.length ? (
          <div className="floor-metrics">
            {metrics.map((item, index) => (
              <motion.article
                key={item.label}
                className="floor-metric"
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: reduce ? 0 : 0.08 + index * 0.06 }}
              >
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </motion.article>
            ))}
          </div>
        ) : null}
      </header>
      <div className="floor-body">{children}</div>
    </section>
  );
}

export function Explore() {
  const { books, openBook, setScreen, selectBook, publishBook } = useBooks();
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [betaCode, setBetaCode] = useState("");
  const needle = query.trim().toLowerCase();
  const published = books.filter((book) => book.published);
  const betaInbox = published.filter((book) => book.published?.visibility === "beta");
  const publicShelf = published.filter((book) => book.published?.visibility === "public");

  const hits = useMemo(() => {
    return books.flatMap((book) => {
      const rows: { id: string; title: string; meta: string; bookId: string; kind: string }[] = [];
      const bag = [book.title, book.pitch, book.penName, book.published?.betaCode ?? ""].join(" ").toLowerCase();
      if (!needle || bag.includes(needle)) {
        rows.push({
          id: book.id,
          title: book.title,
          meta: book.published
            ? `${KIND_LABEL[book.kind]} · ${book.published.visibility === "beta" ? "beta" : "publicado"}`
            : KIND_LABEL[book.kind],
          bookId: book.id,
          kind: "Livro",
        });
      }
      if (!needle) return rows;
      for (const chapter of book.chapters) {
        if (!`${chapter.title} ${chapter.synopsis} ${plainText(chapter.body)}`.toLowerCase().includes(needle)) continue;
        rows.push({
          id: chapter.id,
          title: chapter.title || "Sem título",
          meta: book.title,
          bookId: book.id,
          kind: "Capítulo",
        });
      }
      for (const note of book.research) {
        if (!`${note.title} ${note.body}`.toLowerCase().includes(needle)) continue;
        rows.push({
          id: note.id,
          title: note.title || "Nota",
          meta: book.title,
          bookId: book.id,
          kind: "Mundo",
        });
      }
      return rows;
    });
  }, [books, needle]);

  const betaMatch = betaCode.trim()
    ? books.find(
        (book) => book.published?.betaCode.toLowerCase() === betaCode.trim().toLowerCase(),
      )
    : null;

  function openInRead(editionId: string) {
    openInReader(editionId);
  }

  return (
    <FloorPage
      kicker="Publicar"
      title="Do manuscrito ao Reader."
      sub="Publica, partilha o código beta, e abre no Reader neste mesmo Inklyst."
      metrics={[
        { label: "Projetos", value: String(books.length), hint: "no Studio" },
        { label: "Público", value: String(publicShelf.length), hint: "no Reader" },
        { label: "Inbox beta", value: String(betaInbox.length), hint: "códigos activos" },
      ]}
    >
      <ol className="publish-pipeline">
        <li>
          <strong>1. Escrever</strong>
          <span>No Studio até haver capítulos legíveis.</span>
        </li>
        <li>
          <strong>2. Publicar</strong>
          <span>Estante pública ou inbox beta com código.</span>
        </li>
        <li>
          <strong>3. Ler</strong>
          <span>Pré-visualizar aqui ou abrir na app Ler.</span>
        </li>
      </ol>

      <div className="explore-top">
        <label className="floor-search">
          <Search size={16} />
          <input
            autoFocus
            value={query}
            placeholder="Procurar livros, capítulos, personagens…"
            aria-label="Explorar"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <form
          className="beta-inbox"
          onSubmit={(event) => {
            event.preventDefault();
            if (!betaMatch?.published) return;
            selectBook(betaMatch.id);
            openInRead(betaMatch.published.editionId);
          }}
        >
          <span className="eyebrow">Código beta → Ler</span>
          <input
            value={betaCode}
            placeholder="Ex.: WIND-AB12"
            aria-label="Código beta"
            onChange={(event) => setBetaCode(event.target.value)}
          />
          <button type="submit" className="ghost-btn" disabled={!betaMatch?.published}>
            {betaMatch ? `Abrir «${betaMatch.title}» no Ler` : "Validar código"}
          </button>
          {betaMatch ? (
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                openBook(betaMatch.id, "manuscript");
              }}
            >
              Ou abrir no Studio
            </button>
          ) : null}
        </form>
      </div>

      <div className="floor-stack" style={{ marginBottom: 24 }}>
        <p className="eyebrow">Inbox beta</p>
        {betaInbox.length ? (
          betaInbox.map((book) => (
            <article key={book.id} className="floor-panel beta-card">
              <div className="floor-panel-head">
                <CoverFace book={book} size="thumb" />
                <div>
                  <strong>{book.title}</strong>
                  <small>
                    código <code>{book.published?.betaCode}</code>
                    {" · "}
                    actualizado{" "}
                    {book.published?.publishedAt
                      ? new Date(book.published.publishedAt).toLocaleDateString("pt-PT")
                      : "—"}
                  </small>
                </div>
                <div className="floor-actions">
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() =>
                      void navigator.clipboard.writeText(book.published?.betaCode ?? "")
                    }
                  >
                    Copiar código
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      selectBook(book.id);
                      setScreen("preview");
                    }}
                  >
                    Pré-visualizar
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => book.published && openInRead(book.published.editionId)}
                  >
                    Abrir no Ler <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="floor-panel">
            <div className="floor-panel-head">
              <div>
                <strong>Ainda sem betas</strong>
                <small>No Studio → Publicação, escolhe «Abrir inbox beta».</small>
              </div>
              {books[0] ? (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => void publishBook(books[0].id, "beta")}
                >
                  Criar beta do livro actual
                </button>
              ) : null}
            </div>
          </article>
        )}
      </div>

      {publicShelf.length ? (
        <div className="floor-stack" style={{ marginBottom: 24 }}>
          <p className="eyebrow">Publicados → Ler</p>
          {publicShelf.map((book) => (
            <article key={book.id} className="floor-panel">
              <div className="floor-panel-head">
                <CoverFace book={book} size="thumb" />
                <div>
                  <strong>{book.title}</strong>
                  <small>Visível na estante pública da app Ler</small>
                </div>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => book.published && openInRead(book.published.editionId)}
                >
                  Abrir no Ler <ArrowRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="floor-grid">
        <AnimatePresence mode="popLayout">
          {hits.map((hit, index) => (
            <motion.button
              key={`${hit.kind}-${hit.id}`}
              type="button"
              className="floor-card"
              layout
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28, delay: reduce ? 0 : index * 0.03 }}
              onClick={() => openBook(hit.bookId)}
            >
              <span className="floor-card-kicker">{hit.kind}</span>
              <strong>{hit.title}</strong>
              <small>{hit.meta}</small>
              <span className="floor-card-go">
                Abrir <ArrowRight size={14} />
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      {!hits.length ? <p className="floor-empty">Nada corresponde a esta procura.</p> : null}
    </FloorPage>
  );
}

export function NotesHub() {
  const { books, openBook } = useBooks();
  const reduce = useReducedMotion();
  const rows = useMemo(
    () =>
      books.flatMap((book) => {
        const chapterNotes = book.chapters
          .filter((chapter) => chapter.notes.trim())
          .map((chapter) => ({
            id: `${book.id}-${chapter.id}-n`,
            bookId: book.id,
            title: chapter.title || "Sem título",
            body: chapter.notes,
            meta: `${book.title} · nota de capítulo`,
          }));
        const research = book.research.map((note) => ({
          id: `${book.id}-${note.id}`,
          bookId: book.id,
          title: note.title || "Sem título",
          body: note.body,
          meta: `${book.title} · ${note.kind}`,
        }));
        return [...chapterNotes, ...research];
      }),
    [books],
  );

  return (
    <FloorPage
      kicker="Notas"
      title="O que fica à margem."
      sub="Notas de capítulo e fichas do mundo em todos os livros. Isto não é o manuscrito."
      metrics={[
        { label: "Notas", value: String(rows.length), hint: "em todos os livros" },
        { label: "Livros", value: String(books.length), hint: "com margem" },
      ]}
    >
      <div className="floor-grid wide">
        {rows.map((row, index) => (
          <motion.button
            key={row.id}
            type="button"
            className="floor-card note"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: reduce ? 0 : index * 0.04 }}
            onClick={() => openBook(row.bookId, "notes")}
          >
            <span className="floor-card-kicker">
              <NotebookPen size={12} /> Nota
            </span>
            <strong>{row.title}</strong>
            <p>{row.body.slice(0, 160) || "Vazia."}</p>
            <small>{row.meta}</small>
          </motion.button>
        ))}
      </div>
      {!rows.length ? (
        <p className="floor-empty">Ainda não há notas. Abre um livro e escreve à margem de um capítulo.</p>
      ) : null}
    </FloorPage>
  );
}

export function Goals() {
  const { books, openBook, sessionWords, weekWords, patchBook } = useBooks();
  const reduce = useReducedMotion();
  const todayTotal = books.reduce((sum, book) => sum + sessionWords(book), 0);
  const weekTotal = books.reduce((sum, book) => sum + weekWords(book), 0);
  const dailyAim = books.reduce((sum, book) => sum + book.dailyTarget, 0);

  return (
    <FloorPage
      kicker="Objetivos"
      title="A meta é deste livro."
      sub="Diária e semanal. Sem meta do ano, sem ranking — só o teu ritmo."
      metrics={[
        {
          label: "Hoje",
          value: todayTotal.toLocaleString("pt-PT"),
          hint: `de ${dailyAim.toLocaleString("pt-PT")} palavras`,
        },
        {
          label: "Semana",
          value: weekTotal.toLocaleString("pt-PT"),
          hint: "em todos os livros",
        },
        {
          label: "Livros",
          value: String(books.length),
          hint: "com meta própria",
        },
      ]}
    >
      <div className="floor-stack">
        {books.map((book, index) => {
          const today = sessionWords(book);
          const week = weekWords(book);
          const dayPct = Math.min(100, Math.round((today / Math.max(book.dailyTarget, 1)) * 100));
          return (
            <motion.article
              key={book.id}
              className="floor-panel"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: reduce ? 0 : index * 0.05 }}
            >
              <div className="floor-panel-head">
                <CoverFace book={book} size="thumb" />
                <div>
                  <strong>{book.title}</strong>
                  <small>
                    {wordsOf(book).toLocaleString("pt-PT")} / {book.targetWords.toLocaleString("pt-PT")} palavras ·{" "}
                    {KIND_LABEL[book.kind]}
                  </small>
                  <span className="meter">
                    <i style={{ width: `${progress(book)}%` }} />
                  </span>
                </div>
                <button type="button" className="ghost-btn" onClick={() => openBook(book.id)}>
                  Escrever <ArrowRight size={14} />
                </button>
              </div>
              <div className="floor-rings">
                <div>
                  <em>Hoje</em>
                  <strong>
                    {today.toLocaleString("pt-PT")}
                    <span> / {book.dailyTarget.toLocaleString("pt-PT")}</span>
                  </strong>
                  {dayPct > 0 ? (
                    <span className="meter">
                      <i style={{ width: `${dayPct}%` }} />
                    </span>
                  ) : null}
                </div>
                <div>
                  <em>Semana</em>
                  <strong>
                    {week.toLocaleString("pt-PT")}
                    <span> / {book.weeklyTarget.toLocaleString("pt-PT")}</span>
                  </strong>
                  {week > 0 ? (
                    <span className="meter">
                      <i
                        style={{
                          width: `${Math.min(100, Math.round((week / Math.max(book.weeklyTarget, 1)) * 100))}%`,
                        }}
                      />
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="goal-fields">
                <label>
                  <span>Meta diária</span>
                  <input
                    type="number"
                    min={1}
                    value={book.dailyTarget}
                    aria-label={`Meta diária de ${book.title}`}
                    onChange={(event) => patchBook(book.id, { dailyTarget: Number(event.target.value) || 0 })}
                  />
                </label>
                <label>
                  <span>Meta semanal</span>
                  <input
                    type="number"
                    min={1}
                    value={book.weeklyTarget}
                    aria-label={`Meta semanal de ${book.title}`}
                    onChange={(event) => patchBook(book.id, { weeklyTarget: Number(event.target.value) || 0 })}
                  />
                </label>
              </div>
            </motion.article>
          );
        })}
      </div>
    </FloorPage>
  );
}

export function Stats() {
  const store = useBooks();
  const reduce = useReducedMotion();
  const totals = store.books.reduce(
    (acc, book) => {
      const stats = writingStats(book, {
        dailyPace: book.dailyTarget,
        weekWords: store.weekWords(book),
      });
      return {
        words: acc.words + stats.words,
        scenes: acc.scenes + stats.scenes,
        week: acc.week + stats.weekWords,
        streak: Math.max(acc.streak, book.writeStreak || 0),
        sessions: acc.sessions + (book.sessionLog?.length ?? 0),
        minutes: acc.minutes + (book.sessionLog ?? []).reduce((s, row) => s + (row.minutes || 0), 0),
      };
    },
    { words: 0, scenes: 0, week: 0, streak: 0, sessions: 0, minutes: 0 },
  );

  const recentSessions = useMemo(() => {
    return store.books
      .flatMap((book) =>
        (book.sessionLog ?? []).map((session) => ({
          ...session,
          bookId: book.id,
          bookTitle: book.title,
          chapterTitle:
            book.chapters.find((c) => c.id === session.chapterId)?.title || "Capítulo",
        })),
      )
      .sort((a, b) => b.at - a.at)
      .slice(0, 12);
  }, [store.books]);

  /** Last 14 days activity marks across all books */
  const dayMarks = useMemo(() => {
    const days: { key: string; label: string; words: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const start = d.getTime();
      const end = start + 86400000;
      let words = 0;
      for (const book of store.books) {
        for (const session of book.sessionLog ?? []) {
          if (session.at >= start && session.at < end) words += session.words;
        }
      }
      days.push({
        key,
        label: d.toLocaleDateString("pt-PT", { weekday: "narrow", day: "numeric" }),
        words,
      });
    }
    return days;
  }, [store.books]);

  const maxDay = Math.max(1, ...dayMarks.map((d) => d.words));

  return (
    <FloorPage
      kicker="Ritmo"
      title="O ritmo da escrita."
      sub="Sequência, sessões recentes e previsão — sem transformar o app num jogo."
      metrics={[
        { label: "Palavras", value: totals.words.toLocaleString("pt-PT"), hint: "em todos os livros" },
        { label: "Sequência", value: String(totals.streak), hint: "dias seguidos (melhor)" },
        {
          label: "Sessões",
          value: String(totals.sessions),
          hint: totals.minutes ? `~${totals.minutes} min` : "registadas",
        },
      ]}
    >
      <div className="rhythm-strip" aria-label="Actividade nos últimos 14 dias">
        <p className="eyebrow">Últimas duas semanas</p>
        <div className="rhythm-bars">
          {dayMarks.map((day) => (
            <div key={day.key} className="rhythm-bar" title={`${day.key}: ${day.words} palavras`}>
              <i style={{ height: `${Math.max(8, Math.round((day.words / maxDay) * 100))}%` }} />
              <span>{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="floor-stack">
        {store.books.map((book, index) => {
          const today = store.sessionWords(book);
          const week = store.weekWords(book);
          const stats = writingStats(book, { dailyPace: book.dailyTarget, weekWords: week });
          const sessions = [...(book.sessionLog ?? [])].sort((a, b) => b.at - a.at).slice(0, 4);
          return (
            <motion.article
              key={book.id}
              className="floor-panel"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: reduce ? 0 : index * 0.05 }}
            >
              <div className="floor-panel-head">
                <span
                  className="floor-cover"
                  style={{ backgroundImage: coverArt(book) ? `url("${coverArt(book)}")` : undefined }}
                />
                <div>
                  <strong>{book.title}</strong>
                  <small>
                    {KIND_LABEL[book.kind]} · {stats.progress}% da meta
                    {book.writeStreak ? ` · sequência ${book.writeStreak}` : ""}
                  </small>
                  <span className="meter">
                    <i style={{ width: `${stats.progress}%` }} />
                  </span>
                </div>
                <button type="button" className="ghost-btn" onClick={() => store.openBook(book.id)}>
                  Continuar <ArrowRight size={14} />
                </button>
              </div>
              <div className="floor-stat-row">
                <div>
                  <ChartColumn size={14} />
                  <span>Hoje</span>
                  <strong>{today.toLocaleString("pt-PT")}</strong>
                </div>
                <div>
                  <Target size={14} />
                  <span>Semana</span>
                  <strong>{week.toLocaleString("pt-PT")}</strong>
                </div>
                <div>
                  <BookOpen size={14} />
                  <span>Cenas</span>
                  <strong>{stats.scenes}</strong>
                </div>
                <div>
                  <Eye size={14} />
                  <span>Previsão</span>
                  <strong>
                    {stats.daysToFinish != null ? `~${stats.daysToFinish}d` : "—"}
                  </strong>
                </div>
              </div>
              {sessions.length ? (
                <ul className="session-list">
                  {sessions.map((session) => (
                    <li key={session.id}>
                      <strong>{session.words.toLocaleString("pt-PT")} pal.</strong>
                      <span>
                        {new Date(session.at).toLocaleString("pt-PT", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {session.minutes ? ` · ${session.minutes} min` : ""}
                        {" · meta "}
                        {session.goal.toLocaleString("pt-PT")}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fine">Ainda sem sessões registadas neste livro.</p>
              )}
              <p className="fine">
                {stats.emptyChapters
                  ? `${stats.emptyChapters} capítulos ainda vazios.`
                  : "Todos os capítulos têm texto."}{" "}
                Meta diária: {book.dailyTarget.toLocaleString("pt-PT")} palavras.
              </p>
            </motion.article>
          );
        })}
      </div>

      {recentSessions.length ? (
        <div className="floor-stack" style={{ marginTop: 28 }}>
          <p className="eyebrow">Sessões recentes (todos os livros)</p>
          {recentSessions.map((session) => (
            <article key={session.id} className="floor-panel session-row">
              <div className="floor-panel-head">
                <div>
                  <strong>{session.bookTitle}</strong>
                  <small>
                    {session.chapterTitle} · {session.words.toLocaleString("pt-PT")} palavras
                    {session.minutes ? ` · ${session.minutes} min` : ""}
                  </small>
                </div>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => store.openBook(session.bookId)}
                >
                  Abrir
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </FloorPage>
  );
}

export function Preview() {
  const { books, current, selectBook, openStudio, setScreen, publishBook } = useBooks();
  const reduce = useReducedMotion();
  const [readingId, setReadingId] = useState(current.id);
  const book = books.find((item) => item.id === readingId) ?? current;

  return (
    <FloorPage
      kicker="Ler"
      title="Como o leitor vê."
      sub="Pré-visualização limpa do manuscrito — a mesma edição que a app de leitura mostra depois de publicares."
      metrics={[
        { label: "Livro", value: book.title, hint: KIND_LABEL[book.kind] },
        {
          label: "Palavras",
          value: wordsOf(book).toLocaleString("pt-PT"),
          hint: `${book.chapters.length} capítulos`,
        },
      ]}
    >
      <div className="read-shelf" role="list" aria-label="Escolher livro para ler">
        {books.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === book.id ? "read-chip on" : "read-chip"}
            onClick={() => {
              setReadingId(item.id);
              selectBook(item.id);
            }}
          >
            <CoverFace book={item} size="thumb" />
            <span>{item.title}</span>
          </button>
        ))}
      </div>
      <motion.article
        key={book.id}
        className="read-page"
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="read-toolbar">
          <button type="button" className="ghost-btn" onClick={() => openStudio("manuscript")}>
            Voltar a escrever
          </button>
          <button type="button" className="ghost-btn" onClick={() => setScreen("home")}>
            Projetos
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              void (async () => {
                const result = book.published
                  ? { editionId: book.published.editionId }
                  : await publishBook(book.id, "public");
                if (!result) return;
                openInReader(result.editionId);
              })();
            }}
          >
            Abrir no Reader
          </button>
        </div>
        <p className="eyebrow">Pré-visualização</p>
        <h2>{book.title}</h2>
        {book.penName ? <p className="preview-by">{book.penName}</p> : null}
        {book.chapters.map((chapter) => (
          <section key={chapter.id}>
            <h3>{chapter.title || "Sem título"}</h3>
            <PreviewBody
              body={chapter.body}
              empty={chapter.scenes.length ? "" : "Este capítulo ainda está vazio."}
            />
            {chapter.scenes.map((scene) => (
              <div key={scene.id} className="preview-scene">
                <h4>{scene.title || "Sem título"}</h4>
                <PreviewBody body={scene.body} empty="Esta cena ainda está vazia." />
              </div>
            ))}
          </section>
        ))}
      </motion.article>
    </FloorPage>
  );
}

export function TrashHub() {
  const { books, restoreChapter, openBook } = useBooks();
  const reduce = useReducedMotion();
  const rows = useMemo(
    () =>
      books.flatMap((book) =>
        book.trash.map((chapter) => ({
          id: chapter.id,
          bookId: book.id,
          bookTitle: book.title,
          title: chapter.title || "Sem título",
          words: countWords(chapter.body),
        })),
      ),
    [books],
  );

  return (
    <FloorPage
      kicker="Lixo"
      title="O que saiu do manuscrito."
      sub="Capítulos de todos os livros. Enquanto estão aqui, não contam para a meta nem para o texto junto."
      metrics={[
        { label: "No lixo", value: String(rows.length), hint: "capítulos" },
        {
          label: "Livros",
          value: String(new Set(rows.map((row) => row.bookId)).size),
          hint: "com algo aqui",
        },
      ]}
    >
      <div className="floor-stack">
        {rows.map((row, index) => (
          <motion.article
            key={`${row.bookId}-${row.id}`}
            className="floor-panel trash-row"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: reduce ? 0 : index * 0.04 }}
          >
            <div className="floor-panel-head">
              <span className="trash-ico">
                <Trash2 size={16} />
              </span>
              <div>
                <strong>{row.title}</strong>
                <small>
                  {row.bookTitle} · {row.words.toLocaleString("pt-PT")} palavras
                </small>
              </div>
              <div className="floor-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    restoreChapter(row.bookId, row.id);
                  }}
                >
                  Restaurar
                </button>
                <button type="button" className="ghost-btn" onClick={() => openBook(row.bookId, "trash")}>
                  Ver no livro
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
      {!rows.length ? (
        <motion.div
          className="floor-empty-card"
          initial={reduce ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Trash2 size={22} />
          <p>O lixo está vazio.</p>
          <small>Quando moveres um capítulo para o lixo no estúdio, aparece aqui.</small>
        </motion.div>
      ) : null}
    </FloorPage>
  );
}
