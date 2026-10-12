import {
  BookOpen,
  ChartColumn,
  Clock3,
  GitBranch,
  Globe2,
  NotebookPen,
  PenLine,
  ScrollText,
} from "lucide-react";
import { BooksProvider, useBooks, type Binder } from "./spaces/studio/store";
import { Studio } from "./spaces/studio/Studio";

const DEMO_NAV: { id: Binder; label: string; icon: typeof BookOpen }[] = [
  { id: "manuscript", label: "Manuscrito", icon: PenLine },
  { id: "structure", label: "Estrutura", icon: ScrollText },
  { id: "research", label: "Mundo", icon: Globe2 },
  { id: "timeline", label: "Cronologia", icon: Clock3 },
  { id: "bible", label: "Bíblia", icon: BookOpen },
  { id: "relations", label: "Relações", icon: GitBranch },
  { id: "notes", label: "Notas", icon: NotebookPen },
  { id: "progress", label: "Progresso", icon: ChartColumn },
];

function DemoShell() {
  const store = useBooks();

  if (!store.hydrated) {
    return (
      <div className="lp-demo-loading">
        <p className="fine">A preparar a demo…</p>
      </div>
    );
  }

  return (
    <div className="lp-demo app in-book" data-theme="dark">
      <div className="lp-demo-chrome">
        <div className="lp-demo-dots" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <div className="lp-demo-chrome-copy">
          <strong>Demo do Inklyst Write</strong>
          <span>É o app a sério — escreve, muda de capítulo, abre Mundo e Relações.</span>
        </div>
        <span className="lp-demo-pill">interactiva</span>
      </div>

      <div className="shell lp-demo-shell">
        <nav className="dock" aria-label="Demo do livro">
          <div className="dock-book-title" title={store.current.title}>
            <strong>{store.current.title}</strong>
          </div>
          <div className="dock-group" aria-label="Espaço do livro">
            {DEMO_NAV.map((item) => {
              const Icon = item.icon;
              const on = store.binder === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={on ? "dock-btn on" : "dock-btn"}
                  aria-current={on ? "page" : undefined}
                  onClick={() => store.setBinder(item.id)}
                >
                  <span className="dock-ico">
                    <Icon size={18} />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
        <div className="shell-stage">
          <div className="shell-view">
            <Studio />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Real Studio + dock, in-memory seed — for the landing page. */
export function WriteDemo() {
  return (
    <BooksProvider demo>
      <DemoShell />
    </BooksProvider>
  );
}
