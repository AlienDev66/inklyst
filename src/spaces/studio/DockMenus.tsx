import {
  BookOpen,
  FileDown,
  FileText,
  LogOut,
  Moon,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../auth";
import { SpaceSwitcher } from "../../shell/SpaceSwitcher";
import type { Book } from "./books";
import { exportDocx, exportEpub, exportMarkdown } from "./exportBook";
import { useTheme } from "../../theme";

const LOCAL_NAME_KEY = "inklyst-display-name";

function useDockFlyout(open: boolean, anchorRef: RefObject<HTMLElement | null>) {
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    function place() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 10;
      const width = Math.min(280, window.innerWidth * 0.7);
      let left = rect.right + gap;
      if (left + width > window.innerWidth - 12) {
        left = Math.max(12, rect.left - width - gap);
      }
      const maxH = Math.min(420, window.innerHeight - 24);
      let top = rect.top;
      if (top + maxH > window.innerHeight - 12) {
        top = Math.max(12, window.innerHeight - maxH - 12);
      }
      setStyle({
        position: "fixed",
        top,
        left,
        width,
        maxHeight: maxH,
        zIndex: 80,
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef]);

  return style;
}

function DockFlyout({
  open,
  onClose,
  anchorRef,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const style = useDockFlyout(open, anchorRef);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="dock-menu dock-flyout" role="menu" aria-label={label} ref={menuRef} style={style}>
      {children}
    </div>,
    document.body,
  );
}

export function ExportMenu({ book }: { book: Book }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const formats = [
    {
      id: "pdf",
      label: "PDF",
      hint: "Tipografia, margens e capa",
      run: () => window.dispatchEvent(new CustomEvent("pagina:pdf-options")),
    },
    { id: "epub", label: "EPUB", hint: "Leitura em e-readers", run: () => void exportEpub(book) },
    { id: "docx", label: "DOCX", hint: "Word / Google Docs", run: () => void exportDocx(book) },
    { id: "md", label: "Markdown", hint: "Texto limpo", run: () => exportMarkdown(book) },
  ] as const;

  return (
    <div className="dock-pop">
      <button
        ref={btnRef}
        type="button"
        className={open ? "dock-btn on" : "dock-btn"}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="dock-ico">
          <FileDown size={18} />
        </span>
        Exportar
      </button>
      <DockFlyout
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={btnRef}
        label="Exportar livro"
      >
        <header className="dock-menu-head">
          <span>Exportar</span>
          <button type="button" className="icon-btn tiny" aria-label="Fechar" onClick={() => setOpen(false)}>
            <X size={14} />
          </button>
        </header>
        {formats.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className="dock-menu-item"
            onClick={() => {
              item.run();
              setOpen(false);
            }}
          >
            <FileText size={15} />
            <span>
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </span>
          </button>
        ))}
      </DockFlyout>
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className="dock-btn"
      aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={theme === "dark" ? "Tema claro" : "Tema escuro"}
      onClick={toggleTheme}
    >
      <span className="dock-ico">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</span>
      Tema
    </button>
  );
}

export function ProfileMenu({
  onOpenReader,
  onOpenPublished,
}: {
  onOpenReader?: () => void;
  onOpenPublished?: () => void;
} = {}) {
  const { configured, profile, user, signOut, updateDisplayName } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(() => {
    if (typeof localStorage === "undefined") return "";
    return profile?.display_name || localStorage.getItem(LOCAL_NAME_KEY) || "";
  });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
  }, [profile?.display_name]);

  const display =
    profile?.display_name?.trim() ||
    name.trim() ||
    user?.email?.split("@")[0] ||
    "Tu";
  const email = user?.email || (configured ? "" : "Modo local");
  const initial = display.slice(0, 1).toUpperCase();

  return (
    <div className="dock-pop profile-pop">
      <button
        ref={btnRef}
        type="button"
        className={open ? "dock-btn on" : "dock-btn"}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Perfil"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="dock-avatar" aria-hidden>
          {initial}
        </span>
        Perfil
      </button>

      <DockFlyout
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={btnRef}
        label="Perfil"
      >
        <header className="profile-card">
          <span className="profile-avatar" aria-hidden>
            {initial}
          </span>
          <div>
            <strong>{display}</strong>
            <small>{email || "Sem email"}</small>
          </div>
        </header>

        <div className="profile-theme">
          <span>Espaço</span>
          <SpaceSwitcher compact />
        </div>

        <label className="profile-field">
          <span>Nome a mostrar</span>
          <input
            value={name}
            placeholder="O teu nome"
            onChange={(event) => setName(event.target.value)}
            onBlur={() => {
              const next = name.trim();
              if (!next) return;
              localStorage.setItem(LOCAL_NAME_KEY, next);
              setSaving(true);
              void updateDisplayName(next).finally(() => setSaving(false));
            }}
          />
          {saving ? <small className="fine">A sincronizar…</small> : null}
        </label>

        <div className="profile-theme">
          <span>Aparência</span>
          <div className="profile-theme-row">
            <button
              type="button"
              className={theme === "dark" ? "story-chip on" : "story-chip"}
              onClick={() => setTheme("dark")}
            >
              <Moon size={14} /> Escuro
            </button>
            <button
              type="button"
              className={theme === "light" ? "story-chip on" : "story-chip"}
              onClick={() => setTheme("light")}
            >
              <Sun size={14} /> Claro
            </button>
          </div>
        </div>

        {onOpenReader ? (
          <button
            type="button"
            className="dock-menu-item"
            onClick={() => {
              setOpen(false);
              onOpenReader();
            }}
          >
            <BookOpen size={15} />
            <span>
              <strong>Abrir Reader</strong>
              <small>Ler e descobrir histórias</small>
            </span>
          </button>
        ) : null}

        {onOpenPublished ? (
          <button
            type="button"
            className="dock-menu-item"
            onClick={() => {
              setOpen(false);
              onOpenPublished();
            }}
          >
            <BookOpen size={15} />
            <span>
              <strong>Ver publicação</strong>
              <small>Abrir no Reader</small>
            </span>
          </button>
        ) : null}

        {configured ? (
          <button
            type="button"
            className="dock-menu-item danger"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
          >
            <LogOut size={15} />
            <span>
              <strong>Sair</strong>
              <small>Encerrar sessão</small>
            </span>
          </button>
        ) : (
          <p className="fine profile-note">
            <UserRound size={13} /> A trabalhar em modo local — os livros ficam neste browser.
          </p>
        )}
      </DockFlyout>
    </div>
  );
}
