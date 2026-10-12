import {
  collapseMemoryPrefixDupes,
  confirmTranslation,
  countWords,
  extractMemoryFacts,
} from "@pagina/domain";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  blankBook,
  blankChapter,
  blankPart,
  blankScene,
  chapterOf,
  coverFor,
  dayKey,
  loadBooks,
  saveBooks,
  seedBooks,
  wordsOf,
  type Book,
  type Chapter,
  type ManuscriptComment,
  type Part,
  type ResearchNote,
  type Scene,
  type SheetKind,
  type TimelineEvent,
} from "./books";
import {
  createCloudBook,
  loadCloudBooks,
  syncAllChapterPositions,
  syncDeleteChapter,
  syncManuscriptTitle,
  syncNewChapter,
} from "./data/cloudBooks";
import { syncBookExtras } from "./data/cloudExtras";
import { publishBookToShelf, unpublishBookFromShelf } from "./shelfStore";

export type Screen =
  | "home"
  | "studio"
  | "explore"
  | "notes"
  | "goals"
  | "stats"
  | "preview"
  | "trash";
export type Binder =
  | "manuscript"
  | "structure"
  | "research"
  | "bible"
  | "timeline"
  | "relations"
  | "notes"
  | "progress"
  | "trash";

type Store = {
  books: Book[];
  current: Book;
  cloud: boolean;
  hydrated: boolean;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  binder: Binder;
  setBinder: (binder: Binder) => void;
  openStudio: (binder?: Binder) => void;
  sessionWords: (book: Book) => number;
  weekWords: (book: Book) => number;
  openBook: (id: string, binder?: Binder) => void;
  selectBook: (id: string) => void;
  addBook: (draft: {
    title: string;
    penName: string;
    pitch: string;
    kind: Book["kind"];
    cover: Book["cover"];
    storyType?: Book["storyType"];
    tags?: string[];
    genres?: string[];
    language?: string;
    copyright?: string;
    mature?: boolean;
  }) => void;
  patchBook: (id: string, partial: Partial<Book>) => void;
  selectChapter: (bookId: string, chapterId: string) => void;
  selectScene: (bookId: string, chapterId: string, sceneId: string | null) => void;
  patchChapter: (bookId: string, chapterId: string, partial: Partial<Chapter>) => void;
  patchScene: (bookId: string, chapterId: string, sceneId: string, partial: Partial<Scene>) => void;
  addChapter: (bookId: string, partId?: string | null | undefined) => void;
  addScene: (bookId: string, chapterId: string) => void;
  removeScene: (bookId: string, chapterId: string, sceneId: string) => void;
  addPart: (bookId: string) => string;
  patchPart: (bookId: string, partId: string, partial: Partial<Part>) => void;
  removePart: (bookId: string, partId: string) => void;
  /** Move an existing chapter into a part (or null = Sem parte). Reorders under that acto. */
  assignChapterToPart: (bookId: string, chapterId: string, partId: string | null) => void;
  moveChapterTo: (bookId: string, chapterId: string, targetId: string) => void;
  trashChapter: (bookId: string, chapterId: string) => void;
  restoreChapter: (bookId: string, chapterId: string) => void;
  addSnapshot: (bookId: string, chapterId: string) => void;
  restoreSnapshot: (bookId: string, chapterId: string, snapshotId: string) => void;
  snapshotChapter: (
    bookId: string,
    chapterId: string,
    kind?: "autosave" | "manual" | "pre-ai" | "rewrite",
  ) => void;
  addResearch: (bookId: string, kind?: SheetKind) => string;
  patchResearch: (bookId: string, noteId: string, partial: Partial<ResearchNote>) => void;
  addTimeline: (bookId: string) => string;
  patchTimeline: (bookId: string, eventId: string, partial: Partial<TimelineEvent>) => void;
  removeTimeline: (bookId: string, eventId: string) => void;
  confirmChapterTranslation: (bookId: string, chapterId: string) => void;
  publishBook: (
    bookId: string,
    visibility: "public" | "beta",
  ) => Promise<{ editionId: string; betaCode: string; cloudError: string | null } | null>;
  unpublishBook: (bookId: string) => void;
  addComment: (bookId: string, chapterId: string, anchor: string, body: string, author: string) => void;
  resolveComment: (bookId: string, commentId: string) => void;
  removeComment: (bookId: string, commentId: string) => void;
  refreshMemory: (bookId: string, chapterId: string) => void;
  conflict: { bookId: string; remoteSavedAt: number } | null;
  dismissConflict: () => void;
  keepLocalConflict: () => void;
  takeRemoteConflict: () => void;
};

const BooksContext = createContext<Store | null>(null);

function stamp(book: Book): Book {
  const words = wordsOf(book);
  const day = dayKey();
  const log = book.wordLog.slice();
  const index = log.findIndex((entry) => entry.day === day);
  if (index >= 0) log[index] = { day, words };
  else log.push({ day, words });
  return {
    ...book,
    savedAt: Date.now(),
    revision: (book.revision ?? 0) + 1,
    wordLog: log.slice(-60),
  };
}

function emptyPlaceholder(): Book {
  return blankBook({
    title: "Sem título",
    penName: "",
    pitch: "",
    kind: "novela",
    cover: coverFor("empty"),
  });
}

export function BooksProvider({
  children,
  cloudUserId = null,
  /** In-memory seed only — for the interactive landing demo. Never touches localStorage/cloud. */
  demo = false,
}: {
  children: ReactNode;
  cloudUserId?: string | null;
  demo?: boolean;
}) {
  const cloud = Boolean(cloudUserId) && !demo;
  const demoSeed = useMemo(() => (demo ? seedBooks(1_720_000_000_000) : null), [demo]);
  const [books, setBooks] = useState<Book[]>(() => {
    if (demo) return seedBooks(1_720_000_000_000);
    return cloud ? [] : loadBooks();
  });
  const [currentId, setCurrentId] = useState(() =>
    demo ? seedBooks(1_720_000_000_000)[0]?.id ?? "" : "",
  );
  const [screen, setScreen] = useState<Screen>(demo ? "studio" : "home");
  const [binder, setBinder] = useState<Binder>("manuscript");
  const [floor, setFloor] = useState<Record<string, number>>(() => {
    if (!demo) return {};
    const seeded = seedBooks(1_720_000_000_000);
    return Object.fromEntries(seeded.map((book) => [book.id, wordsOf(book)]));
  });
  const [hydrated, setHydrated] = useState(!cloud || demo);
  const [conflict, setConflict] = useState<{ bookId: string; remoteSavedAt: number } | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutosaveBody = useRef<Record<string, string>>({});
  const remoteSnapshot = useRef<Book | null>(null);

  useEffect(() => {
    if (demo) {
      const seeded = demoSeed ?? seedBooks(1_720_000_000_000);
      setBooks(seeded);
      setCurrentId(seeded[0]?.id ?? "");
      setFloor(Object.fromEntries(seeded.map((book) => [book.id, wordsOf(book)])));
      setScreen("studio");
      setBinder("manuscript");
      setHydrated(true);
      return;
    }

    if (!cloudUserId) {
      const local = loadBooks();
      setBooks(local);
      setCurrentId(local[0]?.id ?? "");
      setFloor(Object.fromEntries(local.map((book) => [book.id, wordsOf(book)])));
      setHydrated(true);
      return;
    }

    let cancelled = false;
    setHydrated(false);
    void loadCloudBooks(cloudUserId, loadBooks()).then((remote) => {
      if (cancelled) return;
      setBooks(remote);
      setCurrentId(remote[0]?.id ?? "");
      setFloor(Object.fromEntries(remote.map((book) => [book.id, wordsOf(book)])));
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [cloudUserId, demo, demoSeed]);

  useEffect(() => {
    if (!hydrated || demo) return;
    saveBooks(books);
  }, [books, hydrated, demo]);

  useEffect(() => {
    if (demo || !cloudUserId || !hydrated || books.length === 0) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      for (const book of books) {
        void syncManuscriptTitle(book.id, book.title);
        void syncAllChapterPositions(book);
        void syncBookExtras(book);
      }
    }, 700);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [books, cloudUserId, hydrated]);

  const booksRef = useRef(books);
  booksRef.current = books;

  // Conflict check: reload cloud periodically
  useEffect(() => {
    if (demo || !cloudUserId || !hydrated || !currentId) return;
    const tick = () => {
      const localList = booksRef.current;
      void loadCloudBooks(cloudUserId, localList).then((remote) => {
        const remoteBook = remote.find((item) => item.id === currentId);
        const localBook = localList.find((item) => item.id === currentId);
        if (!remoteBook || !localBook) return;
        const remoteAt = remoteBook.savedAt || 0;
        if (
          remoteAt > localBook.savedAt + 5000 &&
          (remoteBook.revision ?? 0) > (localBook.revision ?? 0)
        ) {
          remoteSnapshot.current = remoteBook;
          setConflict({ bookId: currentId, remoteSavedAt: remoteAt });
        }
      });
    };
    const id = window.setInterval(tick, 45000);
    return () => window.clearInterval(id);
  }, [cloudUserId, hydrated, currentId, demo]);

  const fallback = useMemo(() => emptyPlaceholder(), []);
  const current = books.find((book) => book.id === currentId) ?? books[0] ?? fallback;

  const api = useMemo<Store>(() => {
    function update(id: string, recipe: (book: Book) => Book) {
      setBooks((list) => list.map((book) => (book.id === id ? stamp(recipe(book)) : book)));
    }

    function snapshotChapter(
      bookId: string,
      chapterId: string,
      kind: "autosave" | "manual" | "pre-ai" | "rewrite" = "manual",
    ) {
      const labels = {
        autosave: "autosave",
        manual: "versão manual",
        "pre-ai": "antes da revisão IA",
        rewrite: "trecho reescrito",
      } as const;
      update(bookId, (book) => ({
        ...book,
        chapters: book.chapters.map((item) => {
          if (item.id !== chapterId) return item;
          const scene = item.activeSceneId
            ? item.scenes.find((entry) => entry.id === item.activeSceneId)
            : null;
          const body = scene?.body ?? item.body;
          const snapshot = {
            id: crypto.randomUUID(),
            at: new Intl.DateTimeFormat("pt-PT", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date()),
            words: countWords(body),
            body,
            kind,
            label: labels[kind],
          };
          if (scene) {
            return {
              ...item,
              scenes: item.scenes.map((entry) =>
                entry.id === scene.id
                  ? { ...entry, snapshots: [snapshot, ...entry.snapshots].slice(0, 20) }
                  : entry,
              ),
            };
          }
          return { ...item, snapshots: [snapshot, ...item.snapshots].slice(0, 20) };
        }),
      }));
    }

    return {
      books,
      current,
      cloud,
      hydrated,
      screen,
      setScreen,
      binder,
      setBinder,
      openStudio(next = "manuscript") {
        setBinder(next);
        setScreen("studio");
      },
      sessionWords(book) {
        const start = floor[book.id];
        if (start === undefined) return 0;
        return Math.max(0, wordsOf(book) - start);
      },
      weekWords(book) {
        const today = wordsOf(book);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const key = dayKey(weekAgo.getTime());
        const past = [...book.wordLog].reverse().find((entry) => entry.day <= key);
        return Math.max(0, today - (past?.words ?? floor[book.id] ?? 0));
      },
      openBook(id, nextBinder = "manuscript") {
        setCurrentId(id);
        setBinder(nextBinder);
        setScreen("studio");
        update(id, (book) => ({ ...book, openedAt: Date.now() }));
      },
      selectBook(id) {
        setCurrentId(id);
        update(id, (book) => ({ ...book, openedAt: Date.now() }));
      },
      addBook(draft) {
        if (cloudUserId) {
          void createCloudBook(cloudUserId, draft).then((book) => {
            if (!book) return;
            setBooks((list) => [book, ...list]);
            setFloor((currentFloor) => ({ ...currentFloor, [book.id]: 0 }));
            setCurrentId(book.id);
            setBinder("manuscript");
            setScreen("studio");
          });
          return;
        }
        const book = blankBook(draft);
        setBooks((list) => [book, ...list]);
        setFloor((currentFloor) => ({ ...currentFloor, [book.id]: 0 }));
        setCurrentId(book.id);
        setBinder("manuscript");
        setScreen("studio");
      },
      patchBook(id, partial) {
        update(id, (book) => ({ ...book, ...partial, id: book.id }));
      },
      selectChapter(bookId, chapterId) {
        update(bookId, (book) => ({
          ...book,
          activeChapterId: chapterId,
          chapters: book.chapters.map((item) =>
            item.id === chapterId ? { ...item, activeSceneId: null } : item,
          ),
        }));
      },
      selectScene(bookId, chapterId, sceneId) {
        update(bookId, (book) => ({
          ...book,
          activeChapterId: chapterId,
          chapters: book.chapters.map((item) =>
            item.id === chapterId ? { ...item, activeSceneId: sceneId } : item,
          ),
        }));
      },
      patchChapter(bookId, chapterId, partial) {
        update(bookId, (book) => ({
          ...book,
          chapters: book.chapters.map((item) =>
            item.id === chapterId ? { ...item, ...partial } : item,
          ),
        }));
      },
      patchScene(bookId, chapterId, sceneId, partial) {
        update(bookId, (book) => ({
          ...book,
          chapters: book.chapters.map((item) => {
            if (item.id !== chapterId) return item;
            return {
              ...item,
              scenes: item.scenes.map((scene) =>
                scene.id === sceneId ? { ...scene, ...partial } : scene,
              ),
            };
          }),
        }));
      },
      addChapter(bookId, partId) {
        update(bookId, (book) => {
          const active = book.chapters.find((item) => item.id === book.activeChapterId);
          const resolved = partId ?? active?.partId ?? book.parts[0]?.id ?? null;
          const created = { ...blankChapter(), partId: resolved };
          const next = {
            ...book,
            activeChapterId: created.id,
            chapters: [
              ...book.chapters.map((item) =>
                item.id === book.activeChapterId ? { ...item, activeSceneId: null } : item,
              ),
              created,
            ],
          };
          if (cloudUserId) {
            void syncNewChapter(next, created, next.chapters.length);
          }
          return next;
        });
      },
      addScene(bookId, chapterId) {
        const scene = blankScene();
        update(bookId, (book) => ({
          ...book,
          activeChapterId: chapterId,
          chapters: book.chapters.map((item) =>
            item.id === chapterId
              ? { ...item, scenes: [...item.scenes, scene], activeSceneId: scene.id }
              : item,
          ),
        }));
      },
      removeScene(bookId, chapterId, sceneId) {
        update(bookId, (book) => ({
          ...book,
          activeChapterId: chapterId,
          chapters: book.chapters.map((item) => {
            if (item.id !== chapterId) return item;
            const scenes = item.scenes.filter((scene) => scene.id !== sceneId);
            const activeSceneId =
              item.activeSceneId === sceneId ? null : item.activeSceneId;
            return { ...item, scenes, activeSceneId };
          }),
        }));
      },
      addPart(bookId) {
        const part = blankPart();
        update(bookId, (book) => ({ ...book, parts: [...book.parts, part] }));
        return part.id;
      },
      patchPart(bookId, partId, partial) {
        update(bookId, (book) => ({
          ...book,
          parts: book.parts.map((part) => (part.id === partId ? { ...part, ...partial } : part)),
        }));
      },
      removePart(bookId, partId) {
        update(bookId, (book) => ({
          ...book,
          parts: book.parts.filter((part) => part.id !== partId),
          chapters: book.chapters.map((item) =>
            item.partId === partId ? { ...item, partId: null } : item,
          ),
        }));
      },
      assignChapterToPart(bookId, chapterId, partId) {
        update(bookId, (book) => {
          const from = book.chapters.findIndex((item) => item.id === chapterId);
          if (from < 0) return book;
          const chapters = book.chapters.slice();
          const [item] = chapters.splice(from, 1);
          const moved = { ...item, partId };
          if (partId) {
            let insertAt = chapters.length;
            for (let i = chapters.length - 1; i >= 0; i -= 1) {
              if (chapters[i]?.partId === partId) {
                insertAt = i + 1;
                break;
              }
            }
            // If no chapter in that part yet, insert after previous parts' chapters
            if (insertAt === chapters.length) {
              const partIndex = book.parts.findIndex((part) => part.id === partId);
              if (partIndex >= 0) {
                const earlier = new Set(book.parts.slice(0, partIndex + 1).map((part) => part.id));
                let last = -1;
                for (let i = 0; i < chapters.length; i += 1) {
                  const pid = chapters[i]?.partId;
                  if (pid && earlier.has(pid)) last = i;
                }
                insertAt = last + 1;
              }
            }
            chapters.splice(insertAt, 0, moved);
          } else {
            chapters.push(moved);
          }
          return { ...book, chapters };
        });
      },
      moveChapterTo(bookId, chapterId, targetId) {
        update(bookId, (book) => {
          if (chapterId === targetId) return book;
          const from = book.chapters.findIndex((item) => item.id === chapterId);
          const to = book.chapters.findIndex((item) => item.id === targetId);
          if (from < 0 || to < 0) return book;
          const targetPartId = book.chapters[to]?.partId ?? null;
          const chapters = book.chapters.slice();
          const [item] = chapters.splice(from, 1);
          const insertAt = from < to ? to - 1 : to;
          chapters.splice(insertAt, 0, { ...item, partId: targetPartId });
          return { ...book, chapters };
        });
      },
      trashChapter(bookId, chapterId) {
        update(bookId, (book) => {
          if (book.chapters.length < 2) return book;
          const chapter = book.chapters.find((item) => item.id === chapterId);
          if (!chapter) return book;
          const chapters = book.chapters.filter((item) => item.id !== chapterId);
          if (cloudUserId) {
            void syncDeleteChapter(chapterId).then(() => {
              void syncAllChapterPositions({ ...book, chapters });
            });
          }
          return {
            ...book,
            chapters,
            trash: [chapter, ...book.trash],
            activeChapterId:
              book.activeChapterId === chapterId ? chapters[0].id : book.activeChapterId,
          };
        });
      },
      restoreChapter(bookId, chapterId) {
        update(bookId, (book) => {
          const chapter = book.trash.find((item) => item.id === chapterId);
          if (!chapter) return book;
          const next = {
            ...book,
            trash: book.trash.filter((item) => item.id !== chapterId),
            chapters: [...book.chapters, chapter],
            activeChapterId: chapter.id,
          };
          if (cloudUserId) {
            void syncNewChapter(next, chapter, next.chapters.length);
          }
          return next;
        });
      },
      addSnapshot(bookId, chapterId) {
        snapshotChapter(bookId, chapterId, "manual");
      },
      snapshotChapter,
      restoreSnapshot(bookId, chapterId, snapshotId) {
        update(bookId, (book) => ({
          ...book,
          chapters: book.chapters.map((item) => {
            if (item.id !== chapterId) return item;
            if (item.activeSceneId) {
              return {
                ...item,
                scenes: item.scenes.map((scene) => {
                  if (scene.id !== item.activeSceneId) return scene;
                  const snapshot = scene.snapshots.find((entry) => entry.id === snapshotId);
                  return snapshot ? { ...scene, body: snapshot.body } : scene;
                }),
              };
            }
            const snapshot = item.snapshots.find((entry) => entry.id === snapshotId);
            if (!snapshot) return item;
            return { ...item, body: snapshot.body };
          }),
        }));
      },
      addResearch(bookId, kind = "nota") {
        const titles: Record<SheetKind, string> = {
          nota: "Nota nova",
          pessoa: "Pessoa nova",
          lugar: "Lugar novo",
          organizacao: "Organização nova",
          evento: "Evento novo",
          objeto: "Objeto novo",
        };
        const note = {
          id: crypto.randomUUID(),
          kind,
          title: titles[kind],
          body: "",
          when: "",
          where: "",
          age: "",
          role: "",
          goal: "",
          fear: "",
          secret: "",
          from: "",
          to: "",
          links: [] as { toId: string; label: string; tone?: string }[],
        };
        update(bookId, (book) => ({ ...book, research: [...book.research, note] }));
        return note.id;
      },
      patchResearch(bookId, noteId, partial) {
        update(bookId, (book) => ({
          ...book,
          research: book.research.map((note) =>
            note.id === noteId ? { ...note, ...partial } : note,
          ),
        }));
      },
      addTimeline(bookId) {
        const event: TimelineEvent = {
          id: crypto.randomUUID(),
          title: "Acontecimento novo",
          when: "",
          note: "",
          linkedIds: [],
        };
        update(bookId, (book) => ({ ...book, timeline: [...book.timeline, event] }));
        return event.id;
      },
      patchTimeline(bookId, eventId, partial) {
        update(bookId, (book) => ({
          ...book,
          timeline: book.timeline.map((event) =>
            event.id === eventId ? { ...event, ...partial } : event,
          ),
        }));
      },
      removeTimeline(bookId, eventId) {
        update(bookId, (book) => ({
          ...book,
          timeline: book.timeline.filter((event) => event.id !== eventId),
        }));
      },
      confirmChapterTranslation(bookId, chapterId) {
        update(bookId, (book) => {
          const translation = book.translations[chapterId];
          const chapter = book.chapters.find((item) => item.id === chapterId);
          if (!translation || !chapter) return book;
          const result = confirmTranslation({ body: chapter.body }, translation);
          return {
            ...book,
            chapters: book.chapters.map((item) =>
              item.id === chapterId ? { ...item, body: result.chapterBody } : item,
            ),
            translations: { ...book.translations, [chapterId]: result.translation },
          };
        });
      },
      async publishBook(bookId, visibility) {
        const book = books.find((item) => item.id === bookId);
        if (!book) return null;
        const { edition, cloudError } = await publishBookToShelf(book, visibility, cloudUserId);
        update(bookId, (currentBook) => ({
          ...currentBook,
          published: {
            editionId: edition.id,
            visibility: edition.visibility,
            betaCode: edition.betaCode,
            publishedAt: edition.publishedAt,
          },
          status: visibility === "public" ? "fechado" : currentBook.status,
        }));
        return { editionId: edition.id, betaCode: edition.betaCode, cloudError };
      },
      unpublishBook(bookId) {
        void unpublishBookFromShelf(bookId);
        update(bookId, (currentBook) => ({ ...currentBook, published: null }));
      },
      addComment(bookId, chapterId, anchor, body, author) {
        const comment: ManuscriptComment = {
          id: crypto.randomUUID(),
          chapterId,
          anchor: anchor.trim(),
          body: body.trim(),
          author: author.trim() || "Eu",
          at: Date.now(),
          resolved: false,
        };
        if (!comment.body) return;
        update(bookId, (book) => ({
          ...book,
          comments: [comment, ...(book.comments ?? [])],
        }));
      },
      resolveComment(bookId, commentId) {
        update(bookId, (book) => ({
          ...book,
          comments: (book.comments ?? []).map((item) =>
            item.id === commentId ? { ...item, resolved: true } : item,
          ),
        }));
      },
      removeComment(bookId, commentId) {
        update(bookId, (book) => ({
          ...book,
          comments: (book.comments ?? []).filter((item) => item.id !== commentId),
        }));
      },
      refreshMemory(bookId, chapterId) {
        update(bookId, (book) => {
          const chapter = book.chapters.find((item) => item.id === chapterId);
          if (!chapter) return book;
          const words =
            countWords(chapter.body) +
            chapter.scenes.reduce((sum, scene) => sum + countWords(scene.body), 0);
          if (words < 40) {
            const cleaned = collapseMemoryPrefixDupes(book.memory);
            return cleaned === book.memory ? book : { ...book, memory: cleaned };
          }
          const facts = extractMemoryFacts(chapter, 8);
          const existingIds = new Set(book.memory.map((item) => item.id));
          const settledText = new Set(
            book.memory
              .filter((item) => item.status !== "pending")
              .map((item) => item.text.replace(/\s+/g, " ").trim().toLowerCase()),
          );
          const fresh = facts
            .filter((fact) => !existingIds.has(fact.id))
            .filter(
              (fact) => !settledText.has(fact.text.replace(/\s+/g, " ").trim().toLowerCase()),
            )
            .map((fact) => ({
              ...fact,
              at: Date.now(),
              status: "pending" as const,
            }));
          const merged = collapseMemoryPrefixDupes([...book.memory, ...fresh]).slice(-80);
          return { ...book, memory: merged };
        });
      },
      conflict,
      dismissConflict() {
        setConflict(null);
        remoteSnapshot.current = null;
      },
      keepLocalConflict() {
        const id = conflict?.bookId;
        setConflict(null);
        remoteSnapshot.current = null;
        if (id) {
          update(id, (book) => ({
            ...book,
            revision: (book.revision ?? 0) + 2,
            savedAt: Date.now(),
          }));
        }
      },
      takeRemoteConflict() {
        const remote = remoteSnapshot.current;
        if (!remote) {
          setConflict(null);
          return;
        }
        setBooks((list) => list.map((book) => (book.id === remote.id ? remote : book)));
        setConflict(null);
        remoteSnapshot.current = null;
      },
    };
  }, [books, binder, cloud, cloudUserId, conflict, current, floor, hydrated, screen]);

  useEffect(() => {
    if (!hydrated) return;
    const book = books.find((item) => item.id === currentId) ?? books[0];
    if (!book) return;
    const chapter = chapterOf(book);
    const body = chapter.activeSceneId
      ? chapter.scenes.find((scene) => scene.id === chapter.activeSceneId)?.body ?? chapter.body
      : chapter.body;
    const key = `${book.id}:${chapter.id}:${chapter.activeSceneId ?? "root"}`;
    const prev = lastAutosaveBody.current[key];
    if (prev === undefined) {
      lastAutosaveBody.current[key] = body;
      return;
    }
    if (prev === body) return;
    if (
      Math.abs(countWords(body) - countWords(prev)) < 12 &&
      Math.abs(body.length - prev.length) < 40
    ) {
      return;
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      lastAutosaveBody.current[key] = body;
      api.snapshotChapter(book.id, chapter.id, "autosave");
    }, 8000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [api, books, currentId, hydrated]);

  return <BooksContext.Provider value={api}>{children}</BooksContext.Provider>;
}

export function useBooks() {
  const store = useContext(BooksContext);
  if (!store) throw new Error("BooksProvider missing");
  return store;
}

export function useChapter(book: Book) {
  return chapterOf(book);
}
