import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { plainText } from "@pagina/domain";
import { SHEET_LABEL } from "./books";
import { useBooks } from "./store";

type Hit = {
  id: string;
  title: string;
  meta: string;
  run: () => void;
};

export function CommandPalette() {
  const store = useBooks();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        setQuery("");
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: Hit[] = [];

    for (const book of store.books) {
      if (!q || `${book.title} ${book.pitch} ${book.penName}`.toLowerCase().includes(q)) {
        list.push({
          id: `book-${book.id}`,
          title: book.title || "Sem título",
          meta: "Livro · Projetos",
          run: () => {
            store.openBook(book.id, "manuscript");
            setOpen(false);
          },
        });
      }
      if (book.id !== store.current.id && q.length < 2) continue;

      for (const chapter of book.chapters) {
        const hay = `${chapter.title} ${plainText(chapter.body)} ${chapter.synopsis}`.toLowerCase();
        if (q && !hay.includes(q)) continue;
        if (!q && book.id !== store.current.id) continue;
        list.push({
          id: `ch-${chapter.id}`,
          title: chapter.title || "Sem título",
          meta: `${book.title} · Capítulo`,
          run: () => {
            store.openBook(book.id, "manuscript");
            store.selectChapter(book.id, chapter.id);
            setOpen(false);
          },
        });
      }

      for (const note of book.research) {
        const hay = `${note.title} ${note.body} ${note.goal ?? ""} ${note.secret ?? ""}`.toLowerCase();
        if (q && !hay.includes(q)) continue;
        if (!q && book.id !== store.current.id) continue;
        list.push({
          id: `w-${note.id}`,
          title: note.title || "Sem título",
          meta: `${book.title} · ${SHEET_LABEL[note.kind]}`,
          run: () => {
            store.openBook(book.id, "research");
            setOpen(false);
          },
        });
      }
    }

    const nav: Hit[] = [
      {
        id: "nav-home",
        title: "Ir à estante",
        meta: "Navegação",
        run: () => {
          store.setScreen("home");
          setOpen(false);
        },
      },
      {
        id: "nav-explore",
        title: "Explorar",
        meta: "Navegação",
        run: () => {
          store.setScreen("explore");
          setOpen(false);
        },
      },
      {
        id: "nav-goals",
        title: "Objetivos",
        meta: "Navegação",
        run: () => {
          store.setScreen("goals");
          setOpen(false);
        },
      },
      {
        id: "nav-stats",
        title: "Ritmo",
        meta: "Navegação",
        run: () => {
          store.setScreen("stats");
          setOpen(false);
        },
      },
    ].filter((item) => !q || item.title.toLowerCase().includes(q));

    return [...nav, ...list].slice(0, 24);
  }, [query, store]);

  if (!open) return null;

  return (
    <div className="cmdk-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <div
        className="cmdk"
        role="dialog"
        aria-label="Pesquisa global"
        onClick={(event) => event.stopPropagation()}
      >
        <label className="cmdk-field">
          <Search size={16} />
          <input
            autoFocus
            value={query}
            placeholder="Pesquisar livros, capítulos, mundo…"
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd>esc</kbd>
        </label>
        <ul className="cmdk-list">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button type="button" onClick={hit.run}>
                <strong>{hit.title}</strong>
                <small>{hit.meta}</small>
              </button>
            </li>
          ))}
          {!hits.length ? <li className="fine">Nada encontrado.</li> : null}
        </ul>
      </div>
    </div>
  );
}
