import {
  advisorFromBook,
  countWords,
  plainText,
  searchManuscript,
  toPublicProcess,
  type AdvisorNote,
} from "@pagina/domain";
import {
  AlignJustify,
  Bold,
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Check,
  Clock,
  Copy,
  Focus,
  GripVertical,
  History,
  Image as ImageIcon,
  Italic,
  LayoutGrid,
  Lightbulb,
  Link2,
  List,
  ListOrdered,
  MapPin,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Redo2,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  StickyNote,
  Trash2,
  Underline,
  Undo2,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  compiledText,
  COVER_HUES,
  KIND_LABEL,
  LABEL_NAME,
  SHEET_LABEL,
  STATUS_LABEL,
  wordsOf,
  type Book,
  type Chapter,
  type DocLabel,
  type DocStatus,
  type ResearchNote,
  type SheetKind,
  type TimelineEvent,
} from "./books";
import { coverArt, CoverFace, fileToCover } from "./Cover";
import {
  advisorSourceLabel,
  askAdvisor,
  askRewrite,
  requestChapterTranslation,
  type AdvisorSource,
} from "./askAdvisor";
import { exportDocx, exportEpub, exportMarkdown } from "./exportBook";
import { PdfExportDialog } from "./PdfExportDialog";
import { shareWritingProcess } from "./data/cloudSocial";
import { openInReader } from "./shelfStore";
import { StoryInfo } from "./StoryInfo";
import { useBooks, useChapter, type Binder } from "./store";
import { useAuth } from "../../auth";
import {
  AskTheBook,
  BiblePanel,
  ContinuityPanel,
  HeatmapPanel,
  MemoryPrompt,
  ReaderMode,
  RelationGraph,
  SessionBar,
  StructureBoard,
  SuggestDiff,
  TimelineBoard,
  VersionHistory,
  WorldSheet,
} from "./story/StoryPanels";

type Section = Binder;
type Mode = "text" | "cork" | "outline" | "flow";
type Panel = "beside" | "fiche" | "publish" | "search";

const PANEL_TITLE: Record<Panel, string> = {
  beside: "Assistente",
  fiche: "Este capítulo",
  publish: "Publicar",
  search: "Procurar",
};

export function Studio() {
  const store = useBooks();
  const book = store.current;
  const chapter = useChapter(book);
  const reduce = useReducedMotion();
  const section = store.binder as Section;
  const setSection = store.setBinder;
  const [mode, setMode] = useState<Mode>("text");
  const [panel, setPanel] = useState<Panel>("beside");
  const [focus, setFocus] = useState(false);
  const [readerMode, setReaderMode] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [companion, setCompanion] = useState(false);
  const [chapterQuery, setChapterQuery] = useState("");
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [rowMenuBox, setRowMenuBox] = useState<{ top: number; right: number } | null>(null);
  const [researchId, setResearchId] = useState(book.research[0]?.id ?? "");
  const [timelineId, setTimelineId] = useState(book.timeline[0]?.id ?? "");
  const [manuscriptQuery, setManuscriptQuery] = useState("");
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [collapsedParts, setCollapsedParts] = useState<Set<string>>(() => new Set());
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(() => new Set());
  const dragArmed = useRef(false);

  function closeRowMenu() {
    setRowMenu(null);
    setRowMenuBox(null);
  }

  function openRowMenu(id: string, anchor: HTMLElement) {
    if (rowMenu === id) {
      closeRowMenu();
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const menuHeight = id.startsWith("part:") || id.startsWith("scene:")
      ? 110
      : Math.min(320, 100 + book.parts.length * 36);
    const gap = 6;
    const top =
      rect.bottom + gap + menuHeight > window.innerHeight
        ? Math.max(8, rect.top - menuHeight - gap)
        : rect.bottom + gap;
    setRowMenuBox({ top, right: Math.max(8, window.innerWidth - rect.right) });
    setRowMenu(id);
  }

  useEffect(() => {
    if (!rowMenu) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".row-menu, .icon-btn.tiny")) return;
      closeRowMenu();
    }
    function onReposition() {
      closeRowMenu();
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [rowMenu]);

  function toggleCollapsed(kind: "part" | "chapter", id: string) {
    const set = kind === "part" ? setCollapsedParts : setCollapsedChapters;
    set((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    setMode("text");
    setFocus(false);
    setReaderMode(false);
    setResearchId(book.research[0]?.id ?? "");
    setTimelineId(book.timeline[0]?.id ?? "");
    setManuscriptQuery("");
    setCopied(false);
    setChapterQuery("");
    closeRowMenu();
    setCollapsedParts(new Set());
    setCollapsedChapters(new Set());
  }, [book.id]);

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (companion) {
        setCompanion(false);
        return;
      }
      if (focus) setFocus(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, companion]);

  function openDesk(next: Panel) {
    if (companion && panel === next) {
      setCompanion(false);
      return;
    }
    setPanel(next);
    setCompanion(true);
  }

  useEffect(() => {
    function onReader() {
      setReaderMode(true);
      setFocus(false);
      setCompanion(false);
    }
    function onPdf() {
      setPdfOpen(true);
    }
    window.addEventListener("pagina:reader-mode", onReader);
    window.addEventListener("pagina:pdf-options", onPdf);
    return () => {
      window.removeEventListener("pagina:reader-mode", onReader);
      window.removeEventListener("pagina:pdf-options", onPdf);
    };
  }, []);

  useEffect(() => {
    const partId = chapter.partId;
    if (partId) {
      setCollapsedParts((current) => {
        if (!current.has(partId)) return current;
        const next = new Set(current);
        next.delete(partId);
        return next;
      });
    }
    if (chapter.activeSceneId) {
      setCollapsedChapters((current) => {
        if (!current.has(chapter.id)) return current;
        const next = new Set(current);
        next.delete(chapter.id);
        return next;
      });
    }
  }, [chapter.id, chapter.partId, chapter.activeSceneId]);

  useEffect(() => {
    if (section === "trash") store.setScreen("trash");
  }, [section, store]);

  const words = wordsOf(book);
  const research = book.research.find((note) => note.id === researchId) ?? book.research[0];
  const timelineEvent =
    book.timeline.find((event) => event.id === timelineId) ?? book.timeline[0] ?? null;
  const scene = chapter.scenes.find((item) => item.id === chapter.activeSceneId) ?? null;
  const writing = scene ?? chapter;
  const cover = coverArt(book);
  const bannerStyle = cover
    ? ({ ["--banner-image" as string]: `url("${cover}")` } as const)
    : undefined;
  const manuscriptHits = useMemo(
    () =>
      searchManuscript(
        {
          title: book.title,
          pitch: book.pitch,
          targetWords: book.targetWords,
          chapters: book.chapters,
          research: book.research,
          timeline: book.timeline,
        },
        manuscriptQuery,
      ),
    [book, manuscriptQuery],
  );
  const advisor = useMemo(
    () =>
      chapter.advisor ??
      advisorFromBook(
        {
          title: book.title,
          pitch: book.pitch,
          targetWords: book.targetWords,
          chapters: book.chapters,
          research: book.research,
          timeline: book.timeline,
        },
        writing.title || chapter.title,
      ),
    [book, chapter.advisor, chapter.title, writing.title],
  );

  const preview = useMemo(
    () =>
      toPublicProcess({
        kind: "writing_session",
        title: chapter.title || "Sem título",
        wordCount: countWords(chapter.body),
        chapterBody: chapter.body,
      }),
    [chapter.body, chapter.title],
  );

  async function copyManuscript() {
    try {
      await navigator.clipboard.writeText(compiledText(book));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className={focus ? "studio focus" : "studio"} aria-label="Estúdio de escrita">
      {readerMode ? <ReaderMode book={book} onClose={() => setReaderMode(false)} /> : null}
      <PdfExportDialog book={book} open={pdfOpen} onClose={() => setPdfOpen(false)} />
      <aside className="rail">
        <div className="rail-blur" style={{ backgroundImage: `url("${coverArt(book) ?? ""}")` }} aria-hidden />
        <div className="rail-shade" aria-hidden />
        <div className="rail-body">
        <label className="rail-search">
          <Search size={15} />
          <input
            value={chapterQuery}
            placeholder="Procurar livros..."
            aria-label="Procurar livros"
            onChange={(event) => setChapterQuery(event.target.value)}
          />
          <kbd>⌘K</kbd>
        </label>
        <div className="rail-cover">
          <CoverFace book={book} size="hero" />
          <label className="edit-cover">
            <Pencil size={12} />
            Editar capa
            <input
              type="file"
              accept="image/*"
              aria-label="Imagem da capa"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void fileToCover(file).then((image) => {
                  store.patchBook(book.id, { cover: { ...book.cover, image } });
                });
              }}
            />
          </label>
        </div>
        <div className="book-head">
          <div className="book-title-row">
            <input
              className="book-name"
              value={book.title}
              aria-label="Título do livro"
              onChange={(event) => store.patchBook(book.id, { title: event.target.value })}
            />
            <button type="button" className="icon-btn" aria-label="Mudar de livro" aria-expanded={rowMenu === "book"} onClick={() => setRowMenu(rowMenu === "book" ? null : "book")}>
              <MoreHorizontal size={16} />
            </button>
          </div>
          <p className="book-genre">{KIND_LABEL[book.kind]}</p>
          <p className="book-kicker">
            <i />
            {STATUS_LABEL[book.status]} · {words.toLocaleString("pt-PT")} palavras
          </p>
          <AnimatePresence>
            {rowMenu === "book" ? (
              <motion.div
                className="card-menu book-menu"
                initial={reduce ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {store.books.map((item) => (
                  <button key={item.id} type="button" onClick={() => { store.openBook(item.id); setRowMenu(null); }}>
                    {item.title}
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <button
          type="button"
          className="add new-chapter"
          onClick={() => {
            setSection("manuscript");
            setMode("text");
            store.addChapter(book.id, chapter.partId);
          }}
        >
          <Plus size={16} />
          Novo capítulo
        </button>
        <div className="structure-adds">
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              store.addPart(book.id);
              setSection("manuscript");
            }}
          >
            Novo acto
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              store.addScene(book.id, chapter.id);
              setSection("manuscript");
              setMode("text");
            }}
          >
            Nova cena
          </button>
        </div>

        <p className="rail-section-label">
          {section === "manuscript"
            ? "Capítulos"
            : section === "structure"
              ? "Estrutura"
              : section === "research"
                ? "Mundo"
                : section === "bible"
                  ? "Bíblia"
                  : section === "timeline"
                    ? "Cronologia"
                    : section === "relations"
                      ? "Relações"
                      : section === "notes"
                        ? "Notas"
                        : section === "progress"
                          ? "Progresso"
                          : "Livro"}
        </p>

        {section === "manuscript" || section === "notes" ? (
          <nav className="binder-list" aria-label="Capítulos do manuscrito">
            {(() => {
              const knownPartIds = new Set(book.parts.map((part) => part.id));
              const groups = [
                ...book.parts.map((part) => ({
                  part,
                  chapters: book.chapters.filter((item) => item.partId === part.id),
                })),
                {
                  part: null as (typeof book.parts)[number] | null,
                  chapters: book.chapters.filter((item) => !item.partId || !knownPartIds.has(item.partId)),
                },
              ].filter((group) => group.part || group.chapters.length > 0);

              const searching = Boolean(chapterQuery.trim());

              return groups.map((group) => {
                const partCollapsed = Boolean(group.part && !searching && collapsedParts.has(group.part.id));
                return (
                <div key={group.part?.id ?? "loose"} className={partCollapsed ? "part-block collapsed" : "part-block"}>
                  {group.part ? (
                    <div
                      className={
                        dragId && overId === `part:${group.part.id}`
                          ? "part-label drop-over"
                          : "part-label"
                      }
                      onDragOver={(event) => {
                        if (!dragId) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setOverId(`part:${group.part!.id}`);
                      }}
                      onDragLeave={() => {
                        setOverId((current) =>
                          current === `part:${group.part!.id}` ? null : current,
                        );
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const from = event.dataTransfer.getData("text/plain") || dragId;
                        if (from) store.assignChapterToPart(book.id, from, group.part!.id);
                        dragArmed.current = false;
                        setDragId(null);
                        setOverId(null);
                      }}
                    >
                      <button
                        type="button"
                        className="collapse-btn"
                        aria-label={partCollapsed ? "Expandir parte" : "Recolher parte"}
                        aria-expanded={!partCollapsed}
                        onClick={() => toggleCollapsed("part", group.part!.id)}
                      >
                        {partCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <span>Acto</span>
                      <input
                        className="part-title"
                        value={group.part.title}
                        aria-label="Título da parte"
                        onChange={(event) => store.patchPart(book.id, group.part!.id, { title: event.target.value })}
                      />
                      <button
                        type="button"
                        className="icon-btn tiny"
                        aria-label="Opções do acto"
                        aria-expanded={rowMenu === `part:${group.part.id}`}
                        onClick={(event) => openRowMenu(`part:${group.part!.id}`, event.currentTarget)}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  ) : book.parts.length > 0 ? (
                    <p
                      className={
                        dragId && overId === "part:loose"
                          ? "part-label static drop-over"
                          : "part-label static"
                      }
                      onDragOver={(event) => {
                        if (!dragId) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setOverId("part:loose");
                      }}
                      onDragLeave={() => {
                        setOverId((current) => (current === "part:loose" ? null : current));
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const from = event.dataTransfer.getData("text/plain") || dragId;
                        if (from) store.assignChapterToPart(book.id, from, null);
                        dragArmed.current = false;
                        setDragId(null);
                        setOverId(null);
                      }}
                    >
                      <span>Sem parte</span>
                    </p>
                  ) : null}
                  <AnimatePresence initial={false}>
                    {!partCollapsed ? (
                      <motion.div
                        key="part-body"
                        className="part-body"
                        initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduce ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                      >
                  {group.chapters.map((item) => {
                    const index = book.chapters.findIndex((entry) => entry.id === item.id);
                    const selected = item.id === chapter.id && !chapter.activeSceneId;
                    const chapterWords =
                      section === "notes"
                        ? countWords(item.notes)
                        : countWords(item.body) + item.scenes.reduce((sum, entry) => sum + countWords(entry.body), 0);
                    const wordsLabel = `${chapterWords.toLocaleString("pt-PT")} palavras`;
                    const needle = chapterQuery.trim().toLowerCase();
                    const chapterHit = !needle || `${item.title} ${book.title}`.toLowerCase().includes(needle);
                    const visibleScenes = item.scenes.filter(
                      (entry) => !needle || `${entry.title} ${entry.body}`.toLowerCase().includes(needle),
                    );
                    if (!chapterHit && visibleScenes.length === 0) return null;
                    const scenes = chapterHit ? item.scenes : visibleScenes;
                    const chapterCollapsed = !searching && collapsedChapters.has(item.id) && scenes.length > 0;
                    return (
                      <div
                        key={item.id}
                        className={[
                          "chapter-block",
                          chapterCollapsed ? "collapsed" : "",
                          dragId === item.id ? "dragging" : "",
                          overId === item.id && dragId && dragId !== item.id ? "drop-over" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        draggable={!chapterQuery.trim()}
                        onDragStart={(event) => {
                          if (!dragArmed.current || chapterQuery.trim()) {
                            event.preventDefault();
                            return;
                          }
                          setDragId(item.id);
                          closeRowMenu();
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", item.id);
                        }}
                        onDragEnd={() => {
                          dragArmed.current = false;
                          setDragId(null);
                          setOverId(null);
                        }}
                        onDragOver={(event) => {
                          if (!dragId || dragId === item.id) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setOverId(item.id);
                        }}
                        onDragLeave={() => {
                          setOverId((current) => (current === item.id ? null : current));
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const from = event.dataTransfer.getData("text/plain") || dragId;
                          if (from && from !== item.id) store.moveChapterTo(book.id, from, item.id);
                          dragArmed.current = false;
                          setDragId(null);
                          setOverId(null);
                        }}
                      >
                        <motion.div
                          className={selected ? "binder-row selected" : "binder-row"}
                          layout={!dragId}
                          initial={reduce ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.28, delay: reduce ? 0 : Math.min(index, 8) * 0.03 }}
                        >
                          {scenes.length > 0 ? (
                            <button
                              type="button"
                              className="collapse-btn"
                              aria-label={chapterCollapsed ? "Expandir cenas" : "Recolher cenas"}
                              aria-expanded={!chapterCollapsed}
                              onClick={() => toggleCollapsed("chapter", item.id)}
                            >
                              {chapterCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </button>
                          ) : (
                            <span className="collapse-spacer" aria-hidden />
                          )}
                          <span
                            className="drag-handle"
                            aria-hidden
                            title="Arrastar para reordenar"
                            onPointerDown={(event) => {
                              if (event.button !== 0 || chapterQuery.trim()) return;
                              dragArmed.current = true;
                            }}
                          >
                            <GripVertical size={14} />
                          </span>
                          <button
                            type="button"
                            className={selected ? "tab selected" : "tab"}
                            aria-current={selected ? "page" : undefined}
                            onClick={() => {
                              store.selectChapter(book.id, item.id);
                              setMode("text");
                            }}
                          >
                            {selected ? <motion.span layoutId="chapter-wash" className="wash" /> : null}
                            <span className="tab-index">{String(index + 1).padStart(2, "0")}</span>
                            <span className="tab-copy">
                              <span className="tab-title">{item.title || "Sem título"}</span>
                              <span className="tab-meta">{wordsLabel}</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            className="icon-btn tiny"
                            aria-label="Opções do capítulo"
                            aria-expanded={rowMenu === item.id}
                            onClick={(event) => openRowMenu(item.id, event.currentTarget)}
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </motion.div>
                        <AnimatePresence initial={false}>
                          {!chapterCollapsed ? (
                            <motion.div
                              key="scenes"
                              className="scene-list"
                              initial={reduce ? false : { height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={reduce ? undefined : { height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              {scenes.map((entry) => {
                                const on = item.id === chapter.id && chapter.activeSceneId === entry.id;
                                const sceneMenuId = `scene:${item.id}:${entry.id}`;
                                return (
                                  <div key={entry.id} className={on ? "scene-row on" : "scene-row"}>
                                    <button
                                      type="button"
                                      className={on ? "scene-tab on" : "scene-tab"}
                                      onClick={() => {
                                        store.selectScene(book.id, item.id, entry.id);
                                        setMode("text");
                                      }}
                                    >
                                      <span className="scene-copy">
                                        <span className="scene-kicker">Cena</span>
                                        <span className="scene-title">{entry.title || "Sem título"}</span>
                                      </span>
                                      <small>{countWords(entry.body).toLocaleString("pt-PT")} palavras</small>
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-btn tiny"
                                      aria-label="Opções da cena"
                                      aria-expanded={rowMenu === sceneMenuId}
                                      onClick={(event) => openRowMenu(sceneMenuId, event.currentTarget)}
                                    >
                                      <MoreHorizontal size={14} />
                                    </button>
                                  </div>
                                );
                              })}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
              });
            })()}
          </nav>
        ) : null}

        {section === "research" ? (
          <nav aria-label="Mundo">
            {book.research.map((note) => (
              <button
                key={note.id}
                type="button"
                className={note.id === research?.id ? "tab selected" : "tab"}
                onClick={() => setResearchId(note.id)}
              >
                <span className="tab-copy">
                  <span className="tab-title">{note.title || "Sem título"}</span>
                  <span className="tab-meta">{SHEET_LABEL[note.kind]}</span>
                </span>
              </button>
            ))}
            {book.research.length === 0 ? (
              <p className="fine">Personagens, lugares, organizações e eventos. Nada disto entra no capítulo.</p>
            ) : null}
          </nav>
        ) : null}

        {section === "timeline" ? (
          <nav aria-label="Cronologia">
            {[...book.timeline]
              .sort((a, b) => a.when.localeCompare(b.when) || a.title.localeCompare(b.title))
              .map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className={event.id === timelineEvent?.id ? "tab selected" : "tab"}
                  onClick={() => setTimelineId(event.id)}
                >
                  <span className="tab-copy">
                    <span className="tab-title">{event.title || "Sem título"}</span>
                    <span className="tab-meta">{event.when || "Sem data"}</span>
                  </span>
                </button>
              ))}
            {book.timeline.length === 0 ? <p className="fine">A cronologia do mundo. Ordem dos acontecimentos, não do manuscrito.</p> : null}
          </nav>
        ) : null}

        {section === "bible" ? (
          <p className="fine rail-hint">Verdades oficiais do universo. O assistente trata isto como cânone.</p>
        ) : null}
        {section === "structure" ? (
          <p className="fine rail-hint">Actos e cartões. Arrasta capítulos para reordenar.</p>
        ) : null}
        {section === "relations" ? (
          <p className="fine rail-hint">Ligações entre pessoas do Mundo. Edita relações nas fichas.</p>
        ) : null}
        {section === "progress" ? (
          <p className="fine rail-hint">Tensão, continuidade, versões e ritmo de escrita.</p>
        ) : null}

        <div className="rail-foot">
          {section === "research" ? (
            <div className="sheet-adds">
              <button type="button" className="text-btn" onClick={() => setResearchId(store.addResearch(book.id, "pessoa"))}>Pessoa</button>
              <button type="button" className="text-btn" onClick={() => setResearchId(store.addResearch(book.id, "lugar"))}>Lugar</button>
              <button type="button" className="text-btn" onClick={() => setResearchId(store.addResearch(book.id, "evento"))}>Evento</button>
              <button type="button" className="text-btn" onClick={() => setResearchId(store.addResearch(book.id, "objeto"))}>Objeto</button>
              <button type="button" className="text-btn" onClick={() => setResearchId(store.addResearch(book.id, "organizacao"))}>Org.</button>
              <button type="button" className="text-btn" onClick={() => setResearchId(store.addResearch(book.id, "nota"))}>Nota</button>
            </div>
          ) : null}
          {section === "timeline" ? (
            <button
              type="button"
              className="text-btn"
              onClick={() => setTimelineId(store.addTimeline(book.id))}
            >
              + Acontecimento
            </button>
          ) : null}
        </div>
        </div>
      </aside>

      {rowMenu && rowMenu !== "book" && rowMenuBox
        ? createPortal(
            <motion.div
              className="card-menu row-menu row-menu-fixed"
              style={{ top: rowMenuBox.top, right: rowMenuBox.right }}
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {rowMenu.startsWith("scene:") ? (
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    const [, chapterId, sceneId] = rowMenu.split(":");
                    if (chapterId && sceneId) store.removeScene(book.id, chapterId, sceneId);
                    setMode("text");
                    closeRowMenu();
                  }}
                >
                  Remover cena
                </button>
              ) : rowMenu.startsWith("part:") ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const partId = rowMenu.slice("part:".length);
                      store.addChapter(book.id, partId);
                      setMode("text");
                      closeRowMenu();
                    }}
                  >
                    Adicionar capítulo neste acto
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      const partId = rowMenu.slice("part:".length);
                      store.removePart(book.id, partId);
                      closeRowMenu();
                    }}
                  >
                    Remover acto
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      store.addScene(book.id, rowMenu);
                      setMode("text");
                      closeRowMenu();
                    }}
                  >
                    Adicionar cena
                  </button>
                  {book.parts.length ? (
                    <div className="row-menu-section">
                      <span className="row-menu-label">Mover para acto</span>
                      {book.parts.map((part) => {
                        const chapterRow = book.chapters.find((item) => item.id === rowMenu);
                        const on = chapterRow?.partId === part.id;
                        return (
                          <button
                            key={part.id}
                            type="button"
                            disabled={on}
                            onClick={() => {
                              store.assignChapterToPart(book.id, rowMenu, part.id);
                              closeRowMenu();
                            }}
                          >
                            {on ? "Já neste acto" : part.title || "Acto"}
                          </button>
                        );
                      })}
                      {book.chapters.find((item) => item.id === rowMenu)?.partId ? (
                        <button
                          type="button"
                          onClick={() => {
                            store.assignChapterToPart(book.id, rowMenu, null);
                            closeRowMenu();
                          }}
                        >
                          Tirar do acto
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      store.trashChapter(book.id, rowMenu);
                      closeRowMenu();
                    }}
                  >
                    Mover para o lixo
                  </button>
                </>
              )}
            </motion.div>,
            document.body,
          )
        : null}

      <section className="stage">
        <div className="stage-tools">
          {section === "manuscript" ? (
            <>
              <button
                type="button"
                className="focus-chip"
                onClick={() => {
                  setFocus((value) => !value);
                  setMode("text");
                  if (!focus) setCompanion(false);
                }}
              >
                <Focus size={14} />
                {focus ? "Sair do foco · ESC" : "Modo foco"}
              </button>
              <button type="button" className="focus-chip" onClick={() => setReaderMode(true)}>
                Ler como leitor
              </button>
              <SessionBar book={book} chapter={chapter} />
            </>
          ) : null}
        </div>
        {section === "manuscript" ? (
          <>
            <div className="stage-scroll">
              <div className="banner" style={bannerStyle} />
              <AnimatePresence mode="wait">
                {mode === "text" ? (
                  <motion.div
                    key={scene?.id ?? chapter.id}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <EditorPage
                      writing={writing}
                      world={book.research}
                      timeline={book.timeline}
                      kicker={
                        scene
                          ? `Cena · ${chapter.title || "Capítulo"}`
                          : `Capítulo ${String(book.chapters.findIndex((item) => item.id === chapter.id) + 1).padStart(2, "0")}`
                      }
                      setMode={setMode}
                      onTitle={(title) => {
                        if (scene) store.patchScene(book.id, chapter.id, scene.id, { title });
                        else store.patchChapter(book.id, chapter.id, { title });
                      }}
                      onBody={(body) => {
                        if (scene) store.patchScene(book.id, chapter.id, scene.id, { body });
                        else store.patchChapter(book.id, chapter.id, { body });
                      }}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>

            {mode === "cork" ? (
              <StructureBoard
                book={book}
                onOpenChapter={(id) => {
                  store.selectChapter(book.id, id);
                  setMode("text");
                }}
              />
            ) : null}

            {mode === "outline" ? (
              <div className="outline-wrap">
                <table className="outline">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Capítulo</th>
                      <th>Estado</th>
                      <th>Etiqueta</th>
                      <th>Palavras</th>
                      <th>Sinopse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {book.chapters.map((item, index) => (
                      <tr key={item.id} className={item.id === chapter.id ? "on" : undefined} onClick={() => store.selectChapter(book.id, item.id)}>
                        <td>{String(index + 1).padStart(2, "0")}</td>
                        <td>
                          <input
                            value={item.title}
                            aria-label={`Título ${index + 1}`}
                            onChange={(event) => store.patchChapter(book.id, item.id, { title: event.target.value })}
                          />
                        </td>
                        <td>
                          <StatusSelect bookId={book.id} chapter={item} />
                        </td>
                        <td>
                          <LabelSelect bookId={book.id} chapter={item} />
                        </td>
                        <td>{countWords(item.body)}</td>
                        <td>
                          <input
                            value={item.synopsis}
                            aria-label={`Sinopse ${index + 1}`}
                            onChange={(event) => store.patchChapter(book.id, item.id, { synopsis: event.target.value })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {mode === "flow" ? (
              <article className="scriven">
                <p className="fine">Os capítulos e cenas pela ordem do binder. O lixo fica de fora.</p>
                {book.chapters.map((item) => (
                  <section key={item.id}>
                    <button type="button" className="card-name" onClick={() => { store.selectChapter(book.id, item.id); setMode("text"); }}>
                      {item.title || "Sem título"}
                    </button>
                    <p>{plainText(item.body) || (item.scenes.length ? "" : "Este capítulo ainda está vazio.")}</p>
                    {item.scenes.map((entry) => (
                      <div key={entry.id} className="flow-scene">
                        <button
                          type="button"
                          className="card-name scene"
                          onClick={() => {
                            store.selectScene(book.id, item.id, entry.id);
                            setMode("text");
                          }}
                        >
                          {entry.title || "Cena"}
                        </button>
                        <p>{plainText(entry.body) || "Esta cena ainda está vazia."}</p>
                      </div>
                    ))}
                  </section>
                ))}
                <button type="button" className="text-btn" onClick={copyManuscript}>
                  {copied ? "Manuscrito copiado" : "Copiar o texto junto"}
                </button>
              </article>
            ) : null}
            </div>
            <footer className="editor-foot">
              <span>
                <i className="saved-dot" />{" "}
                Guardado {new Date(book.savedAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span>{countWords(writing.body).toLocaleString("pt-PT")} palavras</span>
            </footer>
          </>
        ) : null}

        {section === "notes" ? (
          <div className="stage-scroll">
            <div className="banner" style={bannerStyle} />
            <p className="chapter-kicker">Nota</p>
            <h2 className="chapter-title static">{chapter.title || "Sem título"}</h2>
            <textarea
              className="prose"
              value={chapter.notes}
              aria-label="Notas do capítulo"
              placeholder="Notas que não entram no capítulo."
              onChange={(event) => store.patchChapter(book.id, chapter.id, { notes: event.target.value })}
            />
          </div>
        ) : null}

        {section === "research" && research ? (
          <div className="stage-scroll world-stage">
            <motion.div
              className="leaf world-leaf"
              key={research.id}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <WorldSheet book={book} note={research} />
            </motion.div>
          </div>
        ) : null}

        {section === "research" && !research ? (
          <div className="stage-empty">
            <Users size={22} />
            <h2>O mundo deste livro</h2>
            <p>Personagens, lugares, eventos, objetos e organizações — a IA lê isto como verdade.</p>
            <button type="button" className="ghost-btn" onClick={() => setResearchId(store.addResearch(book.id, "pessoa"))}>
              Criar pessoa
            </button>
          </div>
        ) : null}

        {section === "bible" ? (
          <div className="stage-scroll world-stage">
            <div className="leaf world-leaf">
              <BiblePanel book={book} />
            </div>
          </div>
        ) : null}

        {section === "structure" ? (
          <div className="stage-scroll">
            <StructureBoard
              book={book}
              onOpenChapter={(id) => {
                store.selectChapter(book.id, id);
                setSection("manuscript");
                setMode("text");
              }}
            />
          </div>
        ) : null}

        {section === "relations" ? (
          <div className="stage-scroll world-stage">
            <div className="leaf world-leaf wide">
              <RelationGraph
                book={book}
                onOpenWorld={(noteId) => {
                  setSection("research");
                  if (noteId) setResearchId(noteId);
                }}
              />
            </div>
          </div>
        ) : null}

        {section === "progress" ? (
          <div className="stage-scroll world-stage progress-stage">
            <div className="leaf world-leaf">
              <HeatmapPanel book={book} />
              <ContinuityPanel book={book} />
              <VersionHistory book={book} chapter={chapter} />
            </div>
          </div>
        ) : null}

        {section === "timeline" ? (
          <div className="stage-scroll world-stage">
            <div className="leaf world-leaf wide">
              <TimelineBoard
                book={book}
                selectedId={timelineId}
                onSelect={setTimelineId}
              />
            </div>
          </div>
        ) : null}

        {!focus ? (
          <>
            <nav className="desk-dock" aria-label="Ferramentas do estúdio">
              <button
                type="button"
                className={companion && panel === "beside" ? "on" : undefined}
                onClick={() => openDesk("beside")}
              >
                <Sparkles size={15} />
                <span>Ajuda</span>
              </button>
              <button
                type="button"
                className={companion && panel === "fiche" ? "on" : undefined}
                onClick={() => openDesk("fiche")}
              >
                <BookOpen size={15} />
                <span>Capítulo</span>
              </button>
              <button
                type="button"
                className={companion && panel === "publish" ? "desk-publish on" : "desk-publish"}
                onClick={() => openDesk("publish")}
              >
                <Upload size={15} />
                <span>Publicar</span>
              </button>
              <button
                type="button"
                className={companion && panel === "search" ? "on" : undefined}
                onClick={() => openDesk("search")}
              >
                <Search size={15} />
                <span>Procurar</span>
              </button>
            </nav>

            <AnimatePresence>
              {companion ? (
                  <motion.button
                    key="desk-scrim"
                    type="button"
                    className="desk-scrim"
                    aria-label="Fechar painel"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setCompanion(false)}
                  />
              ) : null}
              {companion ? (
                  <motion.aside
                    key="desk-sheet"
                    className="desk-sheet"
                    aria-label={PANEL_TITLE[panel]}
                    initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? undefined : { opacity: 0, y: 18, scale: 0.98 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="desk-handle" aria-hidden />
                    <header className="desk-sheet-head">
                      <div>
                        <p className="desk-kicker">Estúdio</p>
                        <h2>{PANEL_TITLE[panel]}</h2>
                      </div>
                      <button type="button" className="icon-btn close-panel" aria-label="Fechar" onClick={() => setCompanion(false)}>
                        <X size={15} />
                      </button>
                    </header>

                    <AnimatePresence mode="wait">
                      {panel === "fiche" ? (
                        <motion.div
                          key="fiche"
                          className="assist-scroll"
                          initial={reduce ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduce ? undefined : { opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Fiche
                            book={book}
                            chapter={chapter}
                            onCopy={copyManuscript}
                            copied={copied}
                            onGoPublish={() => openDesk("publish")}
                          />
                        </motion.div>
                      ) : null}
                      {panel === "publish" ? (
                        <motion.div
                          key="publish"
                          className="assist-scroll"
                          initial={reduce ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduce ? undefined : { opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                        >
                          <PublishPanel
                            book={book}
                            chapter={chapter}
                            previewTitle={preview.title}
                            previewWords={preview.wordCount ?? 0}
                            shared={sharedId === chapter.id}
                            shareError={shareError}
                            shareBusy={shareBusy}
                            onShare={() => {
                              if (shareBusy || sharedId === chapter.id) return;
                              const authorId = user?.id;
                              if (!authorId) {
                                setShareError("Entra para partilhar no círculo.");
                                return;
                              }
                              setShareBusy(true);
                              setShareError(null);
                              const title = `${book.title} · ${preview.title}`;
                              void shareWritingProcess({
                                authorId,
                                title,
                                wordCount: preview.wordCount ?? 0,
                              })
                                .then((result) => {
                                  if (result.error) {
                                    setShareError(result.error);
                                    return;
                                  }
                                  setSharedId(chapter.id);
                                })
                                .finally(() => setShareBusy(false));
                            }}
                          />
                        </motion.div>
                      ) : null}
                      {panel === "search" ? (
                        <motion.div
                          key="search"
                          className="assist-scroll search-panel"
                          initial={reduce ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduce ? undefined : { opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                        >
                          <label className="search-field">
                            <Search size={14} />
                            <input
                              value={manuscriptQuery}
                              placeholder="Procurar no texto ou no mundo…"
                              aria-label="Procurar no livro"
                              onChange={(event) => setManuscriptQuery(event.target.value)}
                            />
                          </label>
                          {manuscriptQuery.trim() ? (
                            manuscriptHits.length ? (
                              <div className="hit-stack">
                                {manuscriptHits.map((hit) => (
                                  <button
                                    key={`${hit.kind}-${hit.id}`}
                                    type="button"
                                    className="hit"
                                    onClick={() => {
                                      if (hit.kind === "world") {
                                        setSection("research");
                                        setResearchId(hit.id);
                                        return;
                                      }
                                      setSection("manuscript");
                                      setMode("text");
                                      if (hit.kind === "scene") {
                                        const parent = book.chapters.find((item) => item.scenes.some((entry) => entry.id === hit.id));
                                        if (parent) store.selectScene(book.id, parent.id, hit.id);
                                        return;
                                      }
                                      store.selectChapter(book.id, hit.id);
                                    }}
                                  >
                                    <strong>{hit.title}</strong>
                                    <small>
                                      {hit.kind === "chapter" ? "Capítulo" : hit.kind === "scene" ? `Cena · ${hit.parentTitle || ""}` : "Mundo"}
                                      {hit.snippet ? ` · ${hit.snippet}` : ""}
                                    </small>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="search-empty">
                                <p>Nada encontrado para “{manuscriptQuery.trim()}”.</p>
                              </div>
                            )
                          ) : (
                            <div className="search-empty">
                              <p>Escreve para procurar em capítulos, cenas e fichas do mundo.</p>
                              {book.research.length ? (
                                <>
                                  <span className="search-label">No mundo</span>
                                  <div className="hit-stack">
                                    {book.research.slice(0, 6).map((note) => (
                                      <button
                                        key={note.id}
                                        type="button"
                                        className="hit"
                                        onClick={() => {
                                          setSection("research");
                                          setResearchId(note.id);
                                        }}
                                      >
                                        <strong>{note.title || "Sem título"}</strong>
                                        <small>{SHEET_LABEL[note.kind]}</small>
                                      </button>
                                    ))}
                                  </div>
                                </>
                              ) : null}
                            </div>
                          )}
                        </motion.div>
                      ) : null}
                      {panel === "beside" ? (
                        <motion.div
                          key="beside"
                          className="assist-fill"
                          initial={reduce ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduce ? undefined : { opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Beside book={book} chapter={chapter} advisor={advisor} />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.aside>
              ) : null}
            </AnimatePresence>
          </>
        ) : null}
      </section>
    </section>
  );
}

function StatusSelect({ bookId, chapter }: { bookId: string; chapter: Chapter }) {
  const { patchChapter } = useBooks();
  return (
    <select
      aria-label={`Estado de ${chapter.title}`}
      value={chapter.status}
      onChange={(event) => patchChapter(bookId, chapter.id, { status: event.target.value as DocStatus })}
    >
      {(Object.keys(STATUS_LABEL) as DocStatus[]).map((status) => (
        <option key={status} value={status}>{STATUS_LABEL[status]}</option>
      ))}
    </select>
  );
}

function LabelSelect({ bookId, chapter }: { bookId: string; chapter: Chapter }) {
  const { patchChapter } = useBooks();
  return (
    <select
      aria-label={`Etiqueta de ${chapter.title}`}
      value={chapter.label}
      onChange={(event) => patchChapter(bookId, chapter.id, { label: event.target.value as DocLabel })}
    >
      {(Object.keys(LABEL_NAME) as DocLabel[]).map((label) => (
        <option key={label} value={label}>{LABEL_NAME[label]}</option>
      ))}
    </select>
  );
}

function Fiche({
  book,
  chapter,
  onCopy,
  copied,
  onGoPublish,
}: {
  book: Book;
  chapter: Chapter;
  onCopy: () => void;
  copied: boolean;
  onGoPublish: () => void;
}) {
  const store = useBooks();

  return (
    <div className="fiche fiche-slim">
      <button type="button" className="shelf-jump" onClick={onGoPublish}>
        <span className="shelf-jump-ico" aria-hidden>
          {book.published ? <BookOpen size={16} /> : <Upload size={16} />}
        </span>
        <span className="shelf-jump-copy">
          <strong>{book.published ? "Na estante" : "Ainda em rascunho"}</strong>
          <small>{book.published ? "Gerir publicação e código" : "Publicar quando estiver pronto"}</small>
        </span>
        <span className="shelf-jump-go">Abrir</span>
      </button>

      <label>
        <span>Estado</span>
        <StatusSelect bookId={book.id} chapter={chapter} />
      </label>
      <label>
        <span>Tipo de cena</span>
        <LabelSelect bookId={book.id} chapter={chapter} />
      </label>
      <label>
        <span>Em poucas palavras</span>
        <textarea
          value={chapter.synopsis}
          aria-label="Sinopse do capítulo"
          placeholder="O que acontece neste capítulo?"
          onChange={(event) => store.patchChapter(book.id, chapter.id, { synopsis: event.target.value })}
        />
      </label>
      <label>
        <span>Notas privadas</span>
        <textarea
          value={chapter.notes}
          aria-label="Notas do capítulo"
          placeholder="Só para ti — não entram no texto."
          onChange={(event) => store.patchChapter(book.id, chapter.id, { notes: event.target.value })}
        />
      </label>

      <div className="snap-head">
        <History size={14} />
        <span>Versões guardadas</span>
        <button type="button" className="text-btn" onClick={() => store.addSnapshot(book.id, chapter.id)}>
          Guardar agora
        </button>
      </div>
      <ul className="snaps">
        {chapter.snapshots.slice(0, 4).map((snapshot) => (
          <li key={snapshot.id}>
            <span>{snapshot.at} · {snapshot.words} palavras</span>
            <button type="button" className="text-btn" onClick={() => store.restoreSnapshot(book.id, chapter.id, snapshot.id)}>
              Restaurar
            </button>
          </li>
        ))}
        {chapter.snapshots.length === 0 ? <li className="fine">Ainda não guardaste nenhuma versão.</li> : null}
      </ul>

      <CommentsBlock book={book} chapter={chapter} />

      <div className="fiche-actions">
        <button type="button" className="fiche-btn" onClick={onCopy}>
          {copied ? "Texto copiado" : "Copiar texto"}
        </button>
        <button
          type="button"
          className="fiche-btn danger"
          disabled={book.chapters.length < 2}
          onClick={() => store.trashChapter(book.id, chapter.id)}
        >
          <Trash2 size={14} />
          Enviar para o lixo
        </button>
      </div>
    </div>
  );
}

function PublishPanel({
  book,
  chapter,
  previewTitle,
  previewWords,
  shared,
  onShare,
  shareError,
  shareBusy,
}: {
  book: Book;
  chapter: Chapter;
  previewTitle: string;
  previewWords: number;
  shared: boolean;
  onShare: () => void;
  shareError: string | null;
  shareBusy: boolean;
}) {
  const store = useBooks();
  const translation = book.translations[chapter.id];
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  async function runPublish(visibility: "public" | "beta") {
    setPublishing(true);
    setPublishError(null);
    try {
      const result = await store.publishBook(book.id, visibility);
      if (result?.cloudError) {
        setPublishError(
          `${result.cloudError} Ficou guardado neste browser — procura «${book.title}» no Reader.`,
        );
      }
    } finally {
      setPublishing(false);
    }
  }

  async function copyCode() {
    if (!book.published) return;
    try {
      await navigator.clipboard.writeText(book.published.betaCode);
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 1600);
    } catch {
      setCodeCopied(false);
    }
  }

  const publishedAt = book.published?.publishedAt
    ? new Date(book.published.publishedAt).toLocaleDateString("pt-PT", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="fiche publish-panel">
      {book.published ? (
        <article className="shelf-pass">
          <div className="shelf-pass-glow" aria-hidden />
          <div className="shelf-pass-row">
            <CoverFace book={book} size="thumb" />
            <div className="shelf-pass-meta">
              <span className="shelf-pass-badge">
                <i aria-hidden />
                Na estante
                {book.published.visibility === "beta" ? " · beta" : ""}
              </span>
              <strong>{book.title || "Sem título"}</strong>
              <span>
                {book.penName || "Sem nome"}
                {publishedAt ? ` · ${publishedAt}` : ""}
              </span>
            </div>
          </div>

          <button type="button" className="shelf-code" onClick={() => void copyCode()} aria-label="Copiar código da estante">
            <span>Código</span>
            <code>{book.published.betaCode}</code>
            {codeCopied ? <Check size={15} /> : <Copy size={15} />}
          </button>

          <button
            type="button"
            className="shelf-cta"
            onClick={() => openInReader(book.published!.editionId)}
          >
            <BookOpen size={16} />
            Abrir no Reader
          </button>

          <div className="shelf-tools">
            <button
              type="button"
              disabled={publishing}
              onClick={() => void runPublish(book.published!.visibility)}
            >
              <RefreshCw size={14} />
              {publishing ? "A actualizar…" : "Actualizar"}
            </button>
            <button type="button" className="danger" onClick={() => store.unpublishBook(book.id)}>
              <Trash2 size={14} />
              Tirar
            </button>
          </div>
          {publishError ? <p className="fine publish-error">{publishError}</p> : null}
        </article>
      ) : (
        <div className="shelf-launch">
          <p className="shelf-launch-lead">
            Envia a capa, a pitch e o texto para o Reader. Podes actualizar quando quiseres.
          </p>
          <div className="shelf-launch-grid">
            <button
              type="button"
              className="shelf-launch-card primary"
              disabled={publishing}
              onClick={() => void runPublish("public")}
            >
              <Upload size={18} />
              <strong>{publishing ? "A publicar…" : "Publicar agora"}</strong>
              <span>Visível na estante pública</span>
            </button>
            <button
              type="button"
              className="shelf-launch-card"
              disabled={publishing}
              onClick={() => void runPublish("beta")}
            >
              <Copy size={18} />
              <strong>Só com código</strong>
              <span>Beta privado para leitores convidados</span>
            </button>
          </div>
          {publishError ? <p className="fine publish-error">{publishError}</p> : null}
        </div>
      )}

      <StoryInfo book={book} onChange={(patch) => store.patchBook(book.id, patch)} />

      <details className="assist-more">
        <summary>Capa, metas e exportar</summary>
        <div className="fiche-cover">
          <div className="fiche-cover-head">
            <span>Capa</span>
            <label className="text-btn fiche-cover-link">
              {book.cover.image || coverArt(book) ? "Trocar imagem" : "Adicionar imagem"}
              <input
                type="file"
                accept="image/*"
                aria-label="Imagem da capa"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void fileToCover(file).then((image) => {
                    store.patchBook(book.id, { cover: { ...book.cover, image } });
                  });
                }}
              />
            </label>
          </div>
          <div className="hues" role="list" aria-label="Cor da capa">
            {COVER_HUES.map((hue) => (
              <button
                key={hue}
                type="button"
                className={book.cover.hue === hue && !book.cover.image ? "hue on" : "hue"}
                style={{ background: `hsl(${hue} 34% 36%)` }}
                aria-label={`Cor ${hue}`}
                onClick={() => store.patchBook(book.id, { cover: { hue, image: undefined } })}
              />
            ))}
          </div>
        </div>
        <label>
          <span>Nome na capa</span>
          <input
            value={book.penName}
            onChange={(event) => store.patchBook(book.id, { penName: event.target.value })}
          />
        </label>
        <label>
          <span>Tipo de livro</span>
          <select
            value={book.kind}
            onChange={(event) => store.patchBook(book.id, { kind: event.target.value as Book["kind"] })}
          >
            {(Object.keys(KIND_LABEL) as Book["kind"][]).map((kind) => (
              <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Meta de palavras</span>
          <input
            type="number"
            min={1}
            value={book.targetWords}
            onChange={(event) => store.patchBook(book.id, { targetWords: Number(event.target.value) || 0 })}
          />
        </label>
        <div className="export-row">
          <span>Descarregar</span>
          <div className="export-chips">
            <button type="button" className="fiche-chip" onClick={() => window.dispatchEvent(new CustomEvent("pagina:pdf-options"))}>PDF</button>
            <button type="button" className="fiche-chip" onClick={() => void exportEpub(book)}>EPUB</button>
            <button type="button" className="fiche-chip" onClick={() => void exportDocx(book)}>DOCX</button>
            <button type="button" className="fiche-chip" onClick={() => exportMarkdown(book)}>MD</button>
          </div>
        </div>
      </details>

      <details className="assist-more">
        <summary>Partilhar progresso e tradução</summary>
        <div className="publish-box">
          <p className="fine">O círculo vê o título e o progresso — nunca o texto.</p>
          <p className="process-preview">
            {book.title} · {previewTitle} · {previewWords.toLocaleString("pt-PT")} palavras
          </p>
          <button type="button" className="fiche-btn" disabled={shareBusy || shared} onClick={onShare}>
            <Send size={14} />
            {shareBusy ? "A partilhar…" : shared ? "Já partilhado" : "Partilhar progresso"}
          </button>
          {shareError ? <p className="fine publish-error">{shareError}</p> : null}
        </div>
        <div className="publish-box">
          {translation ? (
            <>
              <p className="fine">
                Tradução {translation.locale} ·{" "}
                {translation.status === "machine_draft" ? "rascunho" : "confirmada"}
              </p>
              <p className="translation">{translation.body}</p>
              <button
                type="button"
                className="fiche-btn"
                disabled={translation.status === "author_confirmed"}
                onClick={() => store.confirmChapterTranslation(book.id, chapter.id)}
              >
                Confirmar (mantém o original)
              </button>
            </>
          ) : (
            <>
              <p className="fine">Ainda sem tradução deste capítulo.</p>
              <button
                type="button"
                className="fiche-btn"
                onClick={() => {
                  void requestChapterTranslation(book, chapter.id, "en").then((draft) => {
                    if (!draft) return;
                    store.patchBook(book.id, {
                      translations: {
                        ...book.translations,
                        [chapter.id]: {
                          locale: draft.locale,
                          body: draft.body,
                          status: draft.status,
                        },
                      },
                    });
                  });
                }}
              >
                Pedir rascunho em inglês
              </button>
            </>
          )}
        </div>
      </details>
    </div>
  );
}

function CommentsBlock({ book, chapter }: { book: Book; chapter: Chapter }) {
  const store = useBooks();
  const { profile, user } = useAuth();
  const [anchor, setAnchor] = useState("");
  const [body, setBody] = useState("");
  const author =
    profile?.display_name ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("inklyst-display-name") : null) ||
    user?.email?.split("@")[0] ||
    "Eu";
  const comments = (book.comments ?? []).filter((item) => item.chapterId === chapter.id);

  return (
    <div className="publish-box">
      <span>Comentários</span>
      <p className="fine">Notas no manuscrito — para ti ou para um futuro colaborador.</p>
      <label className="inline-field">
        <span>Trecho (opcional)</span>
        <input
          value={anchor}
          placeholder="Cola ou descreve o sítio"
          onChange={(event) => setAnchor(event.target.value)}
        />
      </label>
      <label className="inline-field">
        <span>Comentário</span>
        <textarea
          value={body}
          placeholder="O que queres lembrar aqui…"
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="fiche-btn"
        onClick={() => {
          store.addComment(book.id, chapter.id, anchor, body, author);
          setBody("");
          setAnchor("");
        }}
      >
        Adicionar comentário
      </button>
      <ul className="comment-list">
        {comments.map((item) => (
          <li key={item.id} className={item.resolved ? "resolved" : undefined}>
            <div>
              <strong>{item.author}</strong>
              {item.anchor ? <em>«{item.anchor}»</em> : null}
              <p>{item.body}</p>
              <small>{new Date(item.at).toLocaleString("pt-PT")}</small>
            </div>
            <span className="memory-actions">
              {!item.resolved ? (
                <button type="button" className="text-btn" onClick={() => store.resolveComment(book.id, item.id)}>
                  Resolver
                </button>
              ) : null}
              <button type="button" className="text-btn" onClick={() => store.removeComment(book.id, item.id)}>
                Apagar
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Beside({
  book,
  chapter,
  advisor,
}: {
  book: Book;
  chapter: Chapter;
  advisor: AdvisorNote;
}) {
  const store = useBooks();
  const [card, setCard] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [advisorSource, setAdvisorSource] = useState<AdvisorSource | null>(null);
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const questions: { id: string; title: string; hint: string; ask: string; color: string; icon: ReactNode }[] = [
    { id: "feedback", title: "Melhorar o texto", hint: "Uma leitura crítica do que escreveste.", ask: advisor.prompt, color: "#3b6fe8", icon: <MessageCircle size={16} /> },
    { id: "scene", title: "Desenvolver a cena", hint: "Ideias para aprofundar este momento.", ask: "O que é que esta cena ainda não mostrou, e que só tu podes escrever?", color: "#e8892d", icon: <Sparkles size={16} /> },
    { id: "block", title: "Estou bloqueado", hint: "Uma pergunta para continuares.", ask: advisor.prompt, color: "#e07a2f", icon: <Lightbulb size={16} /> },
    { id: "continuity", title: "Há contradições?", hint: "Olha o livro inteiro por incoerências.", ask: "Existe alguma inconsistência na história?", color: "#c45c2a", icon: <Link2 size={16} /> },
  ];
  const open = questions.find((item) => item.id === card);

  useEffect(() => {
    function onSelect() {
      const text = window.getSelection()?.toString().trim() ?? "";
      if (text.length > 8 && text.length < 400) setSelection(text);
    }
    document.addEventListener("selectionchange", onSelect);
    return () => document.removeEventListener("selectionchange", onSelect);
  }, []);

  async function runAdvisor(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setSuggestion(null);
    try {
      store.snapshotChapter(book.id, chapter.id, "pre-ai");
      const note = await askAdvisor(book, text, writingTitle(chapter), chapter.id);
      const { source, ...advisorNote } = note;
      setReply(note.prompt);
      setAdvisorSource(source);
      store.patchChapter(book.id, chapter.id, { advisor: advisorNote });
    } finally {
      setBusy(false);
    }
  }

  async function runRewrite(instruction: string) {
    if (!selection || busy) return;
    setBusy(true);
    try {
      store.snapshotChapter(book.id, chapter.id, "pre-ai");
      const next = await askRewrite(book, selection, instruction);
      setSuggestion(next.suggestion);
      setAdvisorSource(next.source);
    } finally {
      setBusy(false);
    }
  }

  function writingTitle(current: Chapter) {
    if (!current.activeSceneId) return current.title;
    return current.scenes.find((scene) => scene.id === current.activeSceneId)?.title || current.title;
  }

  function applySuggestion() {
    if (!suggestion || !selection) return;
    const body = chapter.activeSceneId
      ? chapter.scenes.find((s) => s.id === chapter.activeSceneId)?.body ?? chapter.body
      : chapter.body;
    const next = body.includes(selection) ? body.replace(selection, suggestion) : `${body}\n\n${suggestion}`;
    if (chapter.activeSceneId) {
      store.patchScene(book.id, chapter.id, chapter.activeSceneId, { body: next });
    } else {
      store.patchChapter(book.id, chapter.id, { body: next });
    }
    store.snapshotChapter(book.id, chapter.id, "rewrite");
    setSuggestion(null);
    setSelection("");
  }

  return (
    <>
      <div className="assist-scroll">
        <header className="greet">
          <p>Como posso ajudar?</p>
          <span>Escolhe uma opção ou escreve a tua pergunta em baixo.</span>
          {advisorSource ? (
            <small className={`advisor-source source-${advisorSource}`}>
              {advisorSourceLabel(advisorSource)}
            </small>
          ) : null}
        </header>

        {selection ? (
          <div className="selection-box">
            <p className="eyebrow">Texto seleccionado</p>
            <p className="selection-quote">«{selection}»</p>
            <button
              type="button"
              className="ghost-btn"
              disabled={busy}
              onClick={() => void runRewrite("Torna isto mais tenso sem mudar o meu estilo.")}
            >
              Tornar mais tenso
            </button>
          </div>
        ) : null}

        {suggestion && selection ? (
          <SuggestDiff
            original={selection}
            suggestion={suggestion}
            onAccept={applySuggestion}
            onReject={() => setSuggestion(null)}
            onRetry={() => void runRewrite("Outra variação, mais subtil, mesmo estilo.")}
          />
        ) : null}

        <div className="ask-list">
          {questions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={card === item.id ? "ask-row on" : "ask-row"}
              disabled={busy}
              onClick={() => {
                setCard(item.id);
                void runAdvisor(item.ask);
              }}
            >
              <span className="ask-ico" style={{ background: item.color }}>{item.icon}</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.hint}</small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
        {open ? <div className="bubble"><p>{open.ask}</p><p className="fine">É só uma sugestão — o texto continua teu.</p></div> : null}
        {busy ? <div className="bubble"><p className="fine">A pensar…</p></div> : null}
        {reply && !suggestion ? (
          <div className="bubble">
            <p>{reply}</p>
            <p className="fine">
              Não altera o capítulo sozinho.
              {advisorSource ? ` · ${advisorSourceLabel(advisorSource)}` : ""}
            </p>
          </div>
        ) : null}

        <details className="assist-more">
          <summary>Memória e coerência do livro</summary>
          <ContinuityPanel book={book} />
          <MemoryPrompt book={book} />
          <AskTheBook book={book} />
        </details>
      </div>
      <form
        className="composer-bar"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text) return;
          void runAdvisor(text).then(() => {
            setDraft("");
            setCard(null);
          });
        }}
      >
        <input value={draft} placeholder="Escreve a tua pergunta…" aria-label="Pergunta ao assistente" onChange={(event) => setDraft(event.target.value)} />
        <button type="button" className="icon-btn" aria-label="Anexar" onClick={(event) => event.currentTarget.form?.querySelector("input")?.focus()}><Paperclip size={15} /></button>
        <button type="button" className="icon-btn" aria-label="Escrever a pergunta" onClick={(event) => event.currentTarget.form?.querySelector("input")?.focus()}><Mic size={15} /></button>
        <button type="submit" className="send-round" aria-label="Enviar" disabled={busy}><Send size={15} /></button>
      </form>
    </>
  );
}

type MentionKind = SheetKind | "tempo";
type MentionFilter = "all" | MentionKind;

type MentionItem = {
  id: string;
  title: string;
  subtitle: string;
  kind: MentionKind;
  insert: string;
};

type MentionState = {
  query: string;
  filter: MentionFilter;
  index: number;
  top: number;
  left: number;
  range: Range;
};

const MENTION_KIND_META: Record<MentionKind, { label: string; Icon: typeof User }> = {
  pessoa: { label: "Pessoa", Icon: User },
  lugar: { label: "Lugar", Icon: MapPin },
  organizacao: { label: "Organização", Icon: Building2 },
  evento: { label: "Evento", Icon: Calendar },
  objeto: { label: "Objeto", Icon: StickyNote },
  nota: { label: "Nota", Icon: StickyNote },
  tempo: { label: "Tempo", Icon: Clock },
};

function mentionAtCaret(root: HTMLElement): { query: string; range: Range } | null {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !selection.isCollapsed) return null;
  const caret = selection.getRangeAt(0);
  if (!root.contains(caret.startContainer)) return null;

  let node: Node | null = caret.startContainer;
  let offset = caret.startOffset;
  if (node.nodeType !== Node.TEXT_NODE) {
    const walk = caret.startContainer.childNodes[caret.startOffset - 1]
      ?? caret.startContainer.childNodes[caret.startOffset]
      ?? null;
    if (!walk || walk.nodeType !== Node.TEXT_NODE) return null;
    node = walk;
    offset = walk.textContent?.length ?? 0;
  }

  const text = node.textContent?.slice(0, offset) ?? "";
  const match = text.match(/(?:^|[\s([{"'«„])@([^\s@]*)$/);
  if (!match) return null;
  const at = text.lastIndexOf("@");
  if (at < 0) return null;
  const range = document.createRange();
  range.setStart(node, at);
  range.setEnd(node, offset);
  return { query: match[1] ?? "", range };
}

function caretMenuBox(range: Range) {
  const rect = range.getBoundingClientRect();
  const width = 320;
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
  const below = rect.bottom + 8;
  const top = below + 280 > window.innerHeight ? Math.max(12, rect.top - 288) : below;
  return { top, left };
}

const RICH_MARK_RE = /<\/?(?:b|i|u|em|strong|a|ul|ol|li|h[1-6])\b/i;

function looksLikeRichHtml(value: string) {
  return RICH_MARK_RE.test(value);
}

function readEditorBody(node: HTMLElement) {
  const html = node.innerHTML
    .replace(/^(?:<br\s*\/?>|\s|&nbsp;)*$/i, "")
    .replace(/\u00a0/g, " ");
  if (!html) return "";
  if (!looksLikeRichHtml(html)) {
    return node.innerText.replace(/\n$/, "");
  }
  return html;
}

function writeEditorBody(node: HTMLElement, body: string) {
  if (!body) {
    node.innerHTML = "";
    return;
  }
  if (looksLikeRichHtml(body)) {
    node.innerHTML = body;
    return;
  }
  node.innerText = body;
}

function EditorPage({
  writing,
  world,
  timeline,
  kicker,
  setMode,
  onTitle,
  onBody,
}: {
  writing: { id: string; title: string; body: string };
  world: ResearchNote[];
  timeline: TimelineEvent[];
  kicker: string;
  setMode: (mode: Mode) => void;
  onTitle: (title: string) => void;
  onBody: (body: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  const [menu, setMenu] = useState(false);
  const [mention, setMention] = useState<MentionState | null>(null);
  const reduce = useReducedMotion();

  const items = useMemo<MentionItem[]>(() => {
    const notes = world.map((note) => ({
      id: note.id,
      title: note.title.trim() || "Sem título",
      subtitle: note.body.trim().slice(0, 72) || SHEET_LABEL[note.kind],
      kind: note.kind as MentionKind,
      insert: note.title.trim() || SHEET_LABEL[note.kind],
    }));
    const times = timeline.map((event) => ({
      id: event.id,
      title: event.title.trim() || "Sem título",
      subtitle: event.when.trim() || event.note.trim().slice(0, 72) || "Tempo",
      kind: "tempo" as const,
      insert: event.title.trim() || event.when.trim() || "Tempo",
    }));
    return [...notes, ...times];
  }, [world, timeline]);

  const filtered = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.trim().toLowerCase();
    return items
      .filter((item) => mention.filter === "all" || item.kind === mention.filter)
      .filter((item) => {
        if (!q) return true;
        return `${item.title} ${item.subtitle} ${MENTION_KIND_META[item.kind].label}`.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [items, mention]);

  const groups = useMemo(() => {
    const counts = items.reduce(
      (acc, item) => {
        acc[item.kind] = (acc[item.kind] ?? 0) + 1;
        return acc;
      },
      {} as Partial<Record<MentionKind, number>>,
    );
    return (Object.keys(MENTION_KIND_META) as MentionKind[])
      .filter((kind) => (counts[kind] ?? 0) > 0)
      .map((kind) => ({ kind, count: counts[kind] ?? 0 }));
  }, [items]);

  useEffect(() => {
    const node = ref.current;
    if (!node || focused.current) return;
    const current = readEditorBody(node);
    if (current !== writing.body) writeEditorBody(node, writing.body);
  }, [writing.id, writing.body]);

  useEffect(() => {
    if (!mention) return;
    function onScroll() {
      setMention(null);
    }
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [mention]);

  function syncBody() {
    const node = ref.current;
    if (!node) return;
    const next = readEditorBody(node);
    if (next !== writing.body) onBody(next);
  }

  function refreshMention() {
    const root = ref.current;
    if (!root) {
      setMention(null);
      return;
    }
    const found = mentionAtCaret(root);
    if (!found) {
      setMention(null);
      return;
    }
    const box = caretMenuBox(found.range);
    setMention((prev) => ({
      query: found.query,
      filter: prev?.filter ?? "all",
      index: prev && prev.query === found.query ? prev.index : 0,
      top: box.top,
      left: box.left,
      range: found.range,
    }));
  }

  function cmd(command: string, value?: string) {
    ref.current?.focus();
    document.execCommand(command, false, value);
    syncBody();
  }

  function insertMention(item: MentionItem) {
    const root = ref.current;
    if (!root || !mention) return;
    root.focus();
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(mention.range);
    document.execCommand("insertText", false, item.insert);
    setMention(null);
    syncBody();
  }

  function onEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!mention) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setMention(null);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!filtered.length) return;
      setMention((prev) => (prev ? { ...prev, index: (prev.index + 1) % filtered.length } : prev));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!filtered.length) return;
      setMention((prev) => (prev ? { ...prev, index: (prev.index - 1 + filtered.length) % filtered.length } : prev));
      return;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      if (!filtered.length) return;
      event.preventDefault();
      insertMention(filtered[mention.index] ?? filtered[0]);
    }
  }

  const date = new Date().toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
  const activeFilterLabel = mention && mention.filter !== "all" ? MENTION_KIND_META[mention.filter].label : null;

  return (
    <div className="leaf">
      <p className="chapter-kicker">{kicker}</p>
      <input
        className="chapter-title"
        value={writing.title}
        aria-label="Título"
        onChange={(event) => onTitle(event.target.value)}
      />
      <p className="chapter-meta">
        <Calendar size={13} />
        <span>{date}</span>
        <span>{countWords(writing.body).toLocaleString("pt-PT")} palavras</span>
      </p>
      <div className="rtbar" role="toolbar" aria-label="Formatação">
        <button type="button" aria-label="Desfazer" onMouseDown={(event) => event.preventDefault()} onClick={() => cmd("undo")}><Undo2 size={15} /></button>
        <button type="button" aria-label="Refazer" onMouseDown={(event) => event.preventDefault()} onClick={() => cmd("redo")}><Redo2 size={15} /></button>
        <span className="rt-gap" />
        <div className="rt-drop">
          <button type="button" className="rt-text" onClick={() => setMenu((value) => !value)}>
            Texto <ChevronDown size={13} />
          </button>
          {menu ? (
            <div className="card-menu">
              <button type="button" onClick={() => { setMode("text"); setMenu(false); }}>Texto</button>
              <button type="button" onClick={() => { setMode("cork"); setMenu(false); }}><LayoutGrid size={14} /> Fichas</button>
              <button type="button" onClick={() => { setMode("outline"); setMenu(false); }}><List size={14} /> Lista</button>
              <button type="button" onClick={() => { setMode("flow"); setMenu(false); }}><AlignJustify size={14} /> Contínuo</button>
            </div>
          ) : null}
        </div>
        <button type="button" aria-label="Negrito" onMouseDown={(event) => event.preventDefault()} onClick={() => cmd("bold")}><Bold size={15} /></button>
        <button type="button" aria-label="Itálico" onMouseDown={(event) => event.preventDefault()} onClick={() => cmd("italic")}><Italic size={15} /></button>
        <button type="button" aria-label="Sublinhado" onMouseDown={(event) => event.preventDefault()} onClick={() => cmd("underline")}><Underline size={15} /></button>
        <span className="rt-gap" />
        <button type="button" aria-label="Lista" onMouseDown={(event) => event.preventDefault()} onClick={() => cmd("insertUnorderedList")}><List size={15} /></button>
        <button type="button" aria-label="Lista numerada" onMouseDown={(event) => event.preventDefault()} onClick={() => cmd("insertOrderedList")}><ListOrdered size={15} /></button>
        <button type="button" aria-label="Ligação" onMouseDown={(event) => event.preventDefault()} onClick={() => {
          const url = window.prompt("Endereço da ligação");
          if (url) cmd("createLink", url);
        }}><Link2 size={15} /></button>
        <button type="button" aria-label="A imagem não entra no capítulo" onMouseDown={(event) => event.preventDefault()}><ImageIcon size={15} /></button>
      </div>
      <div
        ref={ref}
        className="prose-page"
        role="textbox"
        aria-multiline="true"
        aria-label="Texto"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Escreve como num documento. Usa @ para trazer pessoas, lugares ou tempos do mundo."
        onFocus={() => { focused.current = true; }}
        onBlur={() => {
          focused.current = false;
          setMention(null);
          syncBody();
        }}
        onKeyDown={onEditorKeyDown}
        onInput={() => {
          syncBody();
          refreshMention();
        }}
      />
      {mention
        ? createPortal(
            <motion.div
              className="mention-menu"
              style={{ top: mention.top, left: mention.left }}
              role="listbox"
              aria-label="Mencionar do mundo"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              onMouseDown={(event) => event.preventDefault()}
            >
              {activeFilterLabel ? (
                <button
                  type="button"
                  className="mention-back"
                  onClick={() => setMention((prev) => (prev ? { ...prev, filter: "all", index: 0 } : prev))}
                >
                  ← Todas as sugestões
                  <span>{activeFilterLabel}</span>
                </button>
              ) : null}

              {filtered.length ? (
                <div className="mention-list">
                  {filtered.map((item, index) => {
                    const { Icon, label } = MENTION_KIND_META[item.kind];
                    return (
                      <button
                        key={`${item.kind}-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={index === mention.index}
                        className={index === mention.index ? "mention-item on" : "mention-item"}
                        onMouseEnter={() => setMention((prev) => (prev ? { ...prev, index } : prev))}
                        onClick={() => insertMention(item)}
                      >
                        <span className={`mention-ico kind-${item.kind}`}>
                          <Icon size={15} />
                        </span>
                        <span className="mention-copy">
                          <strong>{item.title}</strong>
                          <small>{item.subtitle}</small>
                        </span>
                        <em>{label}</em>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mention-empty">
                  {items.length === 0
                    ? "Ainda não há fichas no mundo. Cria uma pessoa, lugar ou tempo."
                    : `Nada para “${mention.query}”.`}
                </p>
              )}

              {mention.filter === "all" && !mention.query && groups.length ? (
                <>
                  <div className="mention-sep" />
                  <div className="mention-groups">
                    {groups.map(({ kind, count }) => {
                      const { Icon, label } = MENTION_KIND_META[kind];
                      return (
                        <button
                          key={kind}
                          type="button"
                          className="mention-group"
                          onClick={() => setMention((prev) => (prev ? { ...prev, filter: kind, index: 0 } : prev))}
                        >
                          <span className={`mention-ico kind-${kind}`}>
                            <Icon size={15} />
                          </span>
                          <span>{label}</span>
                          <small>{count}</small>
                          <ChevronRight size={14} />
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </motion.div>,
            document.body,
          )
        : null}
    </div>
  );
}

