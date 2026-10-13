import {
  ArrowLeft,
  BookOpen,
  ChartColumn,
  Clock3,
  Eye,
  GitBranch,
  Globe2,
  NotebookPen,
  PenLine,
  ScrollText,
  Search,
  Target,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { SpaceSwitcher } from "../../shell/SpaceSwitcher";
import { useSpace } from "../../shell/SpaceContext";
import { CommandPalette } from "./CommandPalette";
import { ExportMenu, ProfileMenu, ThemeToggle } from "./DockMenus";
import { Explore, Goals, NotesHub, Preview, Stats, TrashHub } from "./Floors";
import { Library } from "./Library";
import { PdfExportDialog } from "./PdfExportDialog";
import { modeOf } from "./projectMode";
import { BooksProvider, useBooks, type Binder, type Screen } from "./store";
import { Studio } from "./Studio";
import "./styles.css";

const APP_PRIMARY: { id: Screen; label: string; icon: typeof BookOpen }[] = [
  { id: "home", label: "Projetos", icon: BookOpen },
  { id: "studio", label: "Escrever", icon: PenLine },
  { id: "explore", label: "Publicar", icon: Search },
];

const APP_LIBRARY: { id: Screen; label: string; icon: typeof BookOpen }[] = [
  { id: "notes", label: "Notas", icon: NotebookPen },
  { id: "goals", label: "Objetivos", icon: Target },
  { id: "preview", label: "Pré-visualizar", icon: Eye },
];

const BOOK_NAV_ICONS: Record<Binder, typeof BookOpen> = {
  manuscript: PenLine,
  structure: ScrollText,
  research: Globe2,
  timeline: Clock3,
  bible: BookOpen,
  relations: GitBranch,
  notes: NotebookPen,
  progress: ChartColumn,
  trash: Trash2,
};

export function StudioSpace({ cloudUserId }: { cloudUserId: string | null }) {
  return (
    <BooksProvider cloudUserId={cloudUserId}>
      <StudioShell />
    </BooksProvider>
  );
}

function StudioShell() {
  const store = useBooks();
  const { setSpace, openReaderEdition } = useSpace();
  const reduce = useReducedMotion();
  const active = store.screen;
  const inBook = active === "studio";
  const [pdfOpen, setPdfOpen] = useState(false);

  useEffect(() => {
    function onPdf() {
      setPdfOpen(true);
    }
    function onCreateFromBridge() {
      store.setScreen("home");
      window.dispatchEvent(new CustomEvent("inklyst:open-create-project"));
    }
    window.addEventListener("pagina:pdf-options", onPdf);
    window.addEventListener("inklyst:start-first-story", onCreateFromBridge);
    return () => {
      window.removeEventListener("pagina:pdf-options", onPdf);
      window.removeEventListener("inklyst:start-first-story", onCreateFromBridge);
    };
  }, [store]);

  if (!store.hydrated) {
    return (
      <main className="auth-screen">
        <p className="fine">A sincronizar manuscritos…</p>
      </main>
    );
  }

  function go(id: Screen) {
    if (id === "studio") {
      store.openStudio("manuscript");
      return;
    }
    store.setScreen(id);
  }

  return (
    <main className={inBook ? "app in-book" : "app"}>
      <CommandPalette />
      <PdfExportDialog book={store.current} open={pdfOpen} onClose={() => setPdfOpen(false)} />
      {store.conflict ? (
        <div className="conflict-banner" role="alertdialog" aria-label="Conflito de sincronização">
          <div>
            <strong>Este livro mudou noutro dispositivo.</strong>
            <p className="fine">
              Há uma versão remota mais recente (
              {new Date(store.conflict.remoteSavedAt).toLocaleString("pt-PT")}).
            </p>
          </div>
          <div className="diff-actions">
            <button type="button" className="ghost-btn" onClick={() => store.takeRemoteConflict()}>
              Usar versão remota
            </button>
            <button type="button" className="text-btn" onClick={() => store.keepLocalConflict()}>
              Manter a minha
            </button>
            <button type="button" className="text-btn" onClick={() => store.dismissConflict()}>
              Depois
            </button>
          </div>
        </div>
      ) : null}
      {store.cloud && store.syncState === "error" ? (
        <div className="sync-banner error" role="status">
          <div>
            <strong>A sincronização falhou.</strong>
            <p className="fine">{store.syncError || "O texto ficou neste browser — tenta outra vez."}</p>
          </div>
          <button type="button" className="ghost-btn" onClick={() => store.retrySync()}>
            Tentar outra vez
          </button>
        </div>
      ) : null}
      {store.cloud && store.syncState === "saving" ? (
        <div className="sync-banner" role="status">
          <p className="fine">A guardar na cloud…</p>
        </div>
      ) : null}
      <div className="shell">
        <nav className="dock" aria-label={inBook ? "Livro" : "Studio"}>
          {inBook ? (
            <>
              <button
                type="button"
                className="dock-btn back-shelf"
                onClick={() => go("home")}
                aria-label="Voltar aos projetos"
              >
                <span className="dock-ico">
                  <ArrowLeft size={18} />
                </span>
                Projetos
              </button>

              <div className="dock-book-title" title={store.current.title}>
                <strong>{store.current.title}</strong>
              </div>

              <div className="dock-group" aria-label="Espaço do livro">
                {(() => {
                  const mode = modeOf(store.current.storyType);
                  const allowed = new Set<Binder>([
                    "manuscript",
                    "notes",
                    "progress",
                    "trash",
                    ...mode.binderExtra,
                  ]);
                  const labels: Partial<Record<Binder, string>> = {
                    research: mode.usesWorld ? "Mundo" : "Fichas",
                  };
                  return (Object.keys(BOOK_NAV_ICONS) as Binder[])
                    .filter((id) => allowed.has(id) && id !== "trash")
                    .map((id) => {
                      const Icon = BOOK_NAV_ICONS[id];
                      const on = store.binder === id;
                      const label =
                        labels[id] ??
                        ({
                          manuscript: "Manuscrito",
                          structure: "Estrutura",
                          research: "Mundo",
                          timeline: "Cronologia",
                          bible: "Bíblia",
                          relations: "Relações",
                          notes: "Notas",
                          progress: "Progresso",
                          trash: "Lixo",
                        }[id] ??
                          id);
                      return (
                        <button
                          key={id}
                          type="button"
                          className={on ? "dock-btn on" : "dock-btn"}
                          aria-current={on ? "page" : undefined}
                          onClick={() => store.setBinder(id)}
                        >
                          <span className="dock-ico">
                            <Icon size={18} />
                          </span>
                          {label}
                        </button>
                      );
                    });
                })()}
              </div>

              <div className="dock-rule" aria-hidden />

              <div className="dock-group" aria-label="Leitura e exportação">
                <button
                  type="button"
                  className="dock-btn"
                  onClick={() => {
                    store.setBinder("manuscript");
                    window.dispatchEvent(new CustomEvent("pagina:reader-mode"));
                  }}
                >
                  <span className="dock-ico">
                    <Eye size={18} />
                  </span>
                  Pré-visualizar
                </button>
                <ExportMenu book={store.current} />
              </div>
            </>
          ) : (
            <>
              <a
                className="mark"
                href="#projetos"
                aria-label="Inklyst Studio"
                onClick={(event) => {
                  event.preventDefault();
                  go("home");
                }}
              >
                <img src="/logo.png" alt="" width={40} height={40} draggable={false} />
              </a>

              <div className="dock-group" aria-label="Principal">
                {APP_PRIMARY.map((item) => {
                  const Icon = item.icon;
                  const on = active === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={on ? "dock-btn on" : "dock-btn"}
                      aria-current={on ? "page" : undefined}
                      onClick={() => go(item.id)}
                    >
                      <span className="dock-ico">
                        <Icon size={18} />
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="dock-rule" aria-hidden />

              <div className="dock-group" aria-label="Ferramentas">
                {APP_LIBRARY.map((item) => {
                  const Icon = item.icon;
                  const on = active === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={on ? "dock-btn on" : "dock-btn"}
                      aria-current={on ? "page" : undefined}
                      onClick={() => go(item.id)}
                    >
                      <span className="dock-ico">
                        <Icon size={18} />
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="dock-rule" aria-hidden />

              <div className="dock-group" aria-label="Utilitários">
                <button
                  type="button"
                  className={active === "trash" ? "dock-btn on" : "dock-btn"}
                  aria-current={active === "trash" ? "page" : undefined}
                  onClick={() => go("trash")}
                >
                  <span className="dock-ico">
                    <Trash2 size={18} />
                  </span>
                  Lixo
                </button>
              </div>
            </>
          )}

          <div className="dock-bottom">
            <SpaceSwitcher variant="dock" />
            <ThemeToggle />
            <ProfileMenu
              onOpenReader={() => setSpace("reader", { persist: true })}
              onOpenPublished={
                store.current.published?.editionId
                  ? () => openReaderEdition(store.current.published!.editionId)
                  : undefined
              }
            />
          </div>
        </nav>
        <div className="shell-stage">
          <AnimatePresence mode="wait">
            <motion.div
              key={store.screen}
              className="shell-view"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              {store.screen === "home" ? <Library /> : null}
              {store.screen === "explore" ? <Explore /> : null}
              {store.screen === "notes" ? <NotesHub /> : null}
              {store.screen === "goals" ? <Goals /> : null}
              {store.screen === "stats" ? <Stats /> : null}
              {store.screen === "preview" ? <Preview /> : null}
              {store.screen === "trash" ? <TrashHub /> : null}
              {store.screen === "studio" ? <Studio /> : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
