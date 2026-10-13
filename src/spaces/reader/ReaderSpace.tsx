import {
  canReadMargin,
  canRenderEdition,
  rankCircle,
  toPublicProcess,
  xpAmount,
  type ShelfEdition,
} from "@pagina/domain";
import type { ReadingPairRow } from "@pagina/supabase";
import { ArrowRight, ChevronDown, ChevronLeft, Lock, LogOut, Search, Send } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useAuth } from "../../auth";
import { SpaceSwitcher } from "../../shell/SpaceSwitcher";
import { useSpace } from "../../shell/SpaceContext";
import {
  checkInPage,
  confirmPaperPage,
  ensurePairForEdition,
  followSomeone,
  joinPair,
  loadCloudEdition,
  loadCloudEditions,
  loadCircle,
  loadEditionForWork,
  postMarginNote,
  roomState,
  unlockCloudEdition,
} from "./data/cloudRead";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import {
  addMarginNote,
  listReadableEditions,
  loadShelf,
  notesForEdition,
  unlockWithCode,
} from "./shelfStore";
import { GenreOnboarding, genresDone } from "./GenreOnboarding";
import {
  addLocalIdea,
  createLocalList,
  getLibraryMap,
  libraryByStatus,
  listLocalLists,
  listLocalReviews,
  setLibraryEntry,
  upsertLocalReview,
  countLocalParaComments,
  addEditionToLocalList,
} from "./libraryLocal";
import { BookDetail } from "./BookDetail";
import {
  BROWSE_GENRES,
  SENSATION_CHIPS,
  editionGenre,
  editionsByGenre,
  formatParts,
} from "./catalog";
import { EditionCard } from "./EditionCard";
import { ParagraphSheet } from "./ParagraphThread";
import { getMutePrefs, isMuted, muteEdition } from "./prefsLocal";
import { ProfileView } from "./ProfileView";
import { TtsPlayer } from "./TtsPlayer";
import {
  getProgress,
  mostRecentProgress,
  progressLabel,
  saveProgress,
} from "./readingProgress";
import {
  SAMPLE_BOOKS,
  isSampleEdition,
  mergeCatalog,
  mergeSampleBooks,
  notesForSample,
} from "./sampleBooks";
import "./styles.css";

function Prose({
  text,
  restoreKey,
  restoreParagraph,
  onParagraphChange,
  commentCounts,
  onOpenParagraph,
}: {
  text: string;
  /** Unique per page open — scroll restore runs once, not on every para update. */
  restoreKey: string;
  restoreParagraph: number;
  onParagraphChange: (index: number) => void;
  commentCounts: Map<number, number>;
  onOpenParagraph: (index: number, excerpt: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const didRestore = useRef<string>("");
  const onChangeRef = useRef(onParagraphChange);
  onChangeRef.current = onParagraphChange;
  const [flash, setFlash] = useState<number | null>(null);
  const parts = text.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
  const paras = parts.length ? parts : [text];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (didRestore.current === restoreKey) return;
    didRestore.current = restoreKey;

    if (restoreParagraph <= 0) {
      setFlash(null);
      return;
    }
    const target = root.querySelector<HTMLElement>(`[data-para="${restoreParagraph}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "auto" });
    setFlash(restoreParagraph);
    const timer = window.setTimeout(() => setFlash(null), 1600);
    return () => window.clearTimeout(timer);
    // restoreParagraph only read on first visit of restoreKey
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: do not re-scroll when live paragraph changes
  }, [restoreKey]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = [...root.querySelectorAll<HTMLElement>("[data-para]")];
    if (!nodes.length) return;

    let best = -1;
    let timer: number | undefined;
    let armed = false;
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, 450);

    const observer = new IntersectionObserver(
      (entries) => {
        if (!armed) return;
        let topRatio = 0;
        let topIndex = best;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.para ?? 0);
          if (entry.intersectionRatio >= topRatio) {
            topRatio = entry.intersectionRatio;
            topIndex = index;
          }
        }
        if (topIndex < 0 || topIndex === best) return;
        best = topIndex;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => onChangeRef.current(topIndex), 400);
      },
      { root: null, threshold: [0.35, 0.55, 0.75], rootMargin: "-15% 0px -50% 0px" },
    );
    for (const node of nodes) observer.observe(node);
    return () => {
      window.clearTimeout(armTimer);
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [text, restoreKey]);

  return (
    <div className="rd-prose has-markers" ref={rootRef}>
      {paras.map((part, index) => {
        const count = commentCounts.get(index) ?? 0;
        return (
          <div key={index} className="rd-para-row" data-para={index}>
            <p className={flash === index ? "is-resume" : undefined}>{part}</p>
            <button
              type="button"
              className={count ? "para-mark has" : "para-mark"}
              aria-label={count ? `${count} comentários` : "Comentar parágrafo"}
              onClick={() => onOpenParagraph(index, part.slice(0, 180))}
            >
              {count ? count : "+"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function greetingLine(name: string) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Bom dia" : hour < 20 ? "Boa tarde" : "Boa noite";
  return `${hello}, ${name}.`;
}

const DEMO = SAMPLE_BOOKS[0]!;

type RoomNote = {
  id: string;
  author: string;
  authorId?: string;
  anchorPage: number;
  body: string;
};

function initialEditionId() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("edition") ?? "";
}

export function ReaderSpace({ onOpenCreate }: { onOpenCreate: () => void }) {
  const { configured, signOut, profile, user } = useAuth();
  const { editionId: spaceEditionId, setSpace } = useSpace();
  const reduce = useReducedMotion();
  const cloud = configured && isSupabaseConfigured && Boolean(user);
  const userId = user?.id ?? null;
  const [readerTab, setReaderTab] = useState<"inicio" | "explorar" | "biblioteca" | "comunidade" | "perfil">("inicio");

  const [editions, setEditions] = useState<ShelfEdition[]>([]);
  const [editionId, setEditionId] = useState(() => spaceEditionId || initialEditionId());
  const [page, setPage] = useState(1);
  const [paragraph, setParagraph] = useState(0);
  const [paper, setPaper] = useState(false);
  const [checked, setChecked] = useState(false);
  const [screen, setScreen] = useState<"home" | "detail" | "room">("home");
  const [query, setQuery] = useState("");
  const [browseGenre, setBrowseGenre] = useState<string | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [muteTick, setMuteTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [invite, setInvite] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [notes, setNotes] = useState<RoomNote[]>([]);
  const [pair, setPair] = useState<ReadingPairRow | null>(null);
  const [partnerPage, setPartnerPage] = useState(0);
  const [circle, setCircle] = useState<{ userId: string; xp: number; name?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [pairInvite, setPairInvite] = useState("");
  const [followId, setFollowId] = useState("");
  const [followError, setFollowError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [genreOpen, setGenreOpen] = useState(() => !genresDone());
  const [marginOpen, setMarginOpen] = useState(true);
  const [libraryFilter, setLibraryFilter] = useState<"all" | "reading" | "want" | "finished">("all");
  const [paraOpen, setParaOpen] = useState<{ index: number; excerpt: string } | null>(null);
  const [commentTick, setCommentTick] = useState(0);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [ideaDraft, setIdeaDraft] = useState("");
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, body: "" });
  const [listTitle, setListTitle] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileHandle, setProfileHandle] = useState("");
  const [ebookLicense, setEbookLicense] = useState<string | null>(null);
  const [libTick, setLibTick] = useState(0);

  useEffect(() => {
    if (spaceEditionId && spaceEditionId !== editionId) {
      setEditionId(spaceEditionId);
      const local = listReadableEditions();
      setEditions((list) => mergeCatalog(list, local));
      setScreen("detail");
    }
  }, [spaceEditionId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("inklyst.public_profile");
      if (raw) {
        const parsed = JSON.parse(raw) as { handle?: string; bio?: string };
        setProfileHandle(parsed.handle ?? "");
        setProfileBio(parsed.bio ?? "");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!cloud || !userId) return;
    let cancelled = false;
    void import("@pagina/supabase").then(async ({ listReadingProgress, fetchProfile }) => {
      const rows = await listReadingProgress(supabase, userId);
      if (cancelled) return;
      for (const row of rows) {
        setLibraryEntry({
          editionId: row.edition_id,
          page: row.page,
          paragraph: row.paragraph,
          status: row.status,
          updatedAt: new Date(row.updated_at).getTime(),
        });
        saveProgress({
          editionId: row.edition_id,
          page: row.page,
          paragraph: row.paragraph,
        });
      }
      setLibTick((value) => value + 1);
      const me = await fetchProfile(supabase, userId);
      if (!cancelled && me) {
        if (me.handle) setProfileHandle(me.handle);
        if (me.bio) setProfileBio(me.bio);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cloud, userId]);

  const edition =
    editions.find((item) => item.id === editionId) ??
    loadShelf().editions.find((item) => item.id === editionId) ??
    null;

  useEffect(() => {
    let cancelled = false;
    async function boot(openFromUrl: boolean) {
      const local = listReadableEditions();
      if (cloud) {
        const remote = await loadCloudEditions();
        if (cancelled) return;
        // Sempre funde local + cloud: publicar guarda na estante local mesmo se a cloud falhar.
        setEditions(mergeCatalog(local, remote));
        const ranks = await loadCircle();
        if (!cancelled) {
          setCircle(
            ranks.length
              ? ranks.map((row) => ({ userId: row.name, xp: row.xp }))
              : [{ userId: profile?.display_name || "Tu", xp: 0 }],
          );
        }
        if (openFromUrl) {
          const wanted = initialEditionId();
          if (wanted) {
            const merged = mergeCatalog(local, remote);
            const found =
              merged.find((item) => item.id === wanted) ??
              SAMPLE_BOOKS.find((item) => item.id === wanted) ??
              (await loadCloudEdition(wanted));
            if (found && !cancelled) {
              setEditions((list) => mergeCatalog(list, [found]));
              setEditionId(found.id);
              setScreen("detail");
            }
          }
        }
        return;
      }
      if (cancelled) return;
      setEditions(mergeCatalog(local));
      if (openFromUrl) {
        const wanted = initialEditionId();
        if (wanted) {
          const found =
            local.find((item) => item.id === wanted) ??
            SAMPLE_BOOKS.find((item) => item.id === wanted);
          if (found) {
            setEditions((list) => mergeCatalog(list, [found]));
            setEditionId(found.id);
            setScreen("detail");
          }
        }
      }
    }
    void boot(true);

    function onShelfUpdated() {
      void boot(false);
    }
    window.addEventListener("inklyst:shelf-updated", onShelfUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("inklyst:shelf-updated", onShelfUpdated);
    };
  }, [cloud, profile?.display_name]);

  useEffect(() => {
    if (!edition || screen !== "room") return;

    if (!cloud || !userId || isSampleEdition(edition.id)) {
      const saved = getProgress(edition.id);
      if (saved) {
        setPage(saved.page);
        setParagraph(saved.paragraph);
      }
      if (isSampleEdition(edition.id)) {
        const sampleNotes = notesForSample(edition.id);
        setNotes(sampleNotes.map((note) => ({ ...note })));
        setPair(null);
        // Demo de par só na mesa — página válida dentro do livro.
        setPartnerPage(edition.id === "sample-mesa" ? 3 : 0);
      } else if (!cloud) {
        setNotes(
          notesForEdition(edition.id).map((note) => ({
            id: note.id,
            author: note.author,
            anchorPage: note.anchorPage,
            body: note.body,
          })),
        );
        setPair(null);
        setPartnerPage(0);
      }
      return;
    }

    let cancelled = false;
    void (async () => {
      const progressMod = await import("@pagina/supabase");
      const solo = await progressMod.getReadingProgress(supabase, userId, edition.id);
      if (cancelled) return;
      if (solo) {
        setLibraryEntry({
          editionId: solo.edition_id,
          page: solo.page,
          paragraph: solo.paragraph,
          status: solo.status,
          updatedAt: new Date(solo.updated_at).getTime(),
        });
        saveProgress({
          editionId: solo.edition_id,
          page: solo.page,
          paragraph: solo.paragraph,
        });
      }

      const readyPair = await ensurePairForEdition(edition, userId);
      if (!readyPair || cancelled) {
        if (solo && !cancelled) {
          setPage(solo.page);
          setParagraph(solo.paragraph);
        }
        return;
      }
      setPair(readyPair.pair);
      setPairInvite(readyPair.inviteCode);
      const room = await roomState(readyPair.pair, userId);
      if (cancelled) return;
      const saved = getProgress(edition.id);
      const cloudPage = Math.max(1, room.myPage || 1);
      const soloPage = solo?.page ?? 1;
      const localPage = saved?.page ?? 1;
      const nextPage = Math.max(cloudPage, soloPage, localPage);
      const nextParagraph =
        solo && solo.page === nextPage
          ? solo.paragraph
          : saved && saved.page === nextPage
            ? saved.paragraph
            : 0;
      setPage(nextPage);
      setParagraph(nextParagraph);
      saveProgress({ editionId: edition.id, page: nextPage, paragraph: nextParagraph });
      setPartnerPage(room.partnerPage);
      setNotes(
        room.notes.map((note) => ({
          id: note.id,
          author: note.author_id === userId ? "Tu" : note.author_name,
          authorId: note.author_id,
          anchorPage: note.anchor_page,
          body: note.body,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [cloud, userId, edition?.id, screen]);

  const pages = edition?.pages ?? [];
  /** Manuscript publish (Studio) ships pages in the snapshot — always readable digitally. */
  const hasManuscriptPages = pages.some((pageText) => pageText.trim().length > 0);
  const licensedFile = canRenderEdition({
    licensee:
      ebookLicense ??
      (edition && isSampleEdition(edition.id) ? "pagina-original" : null),
  });
  /** Paper mode hides the digital page on purpose; Digital shows manuscript pages or a licensed file. */
  const showDigitalText = !paper && (hasManuscriptPages || licensedFile);

  useEffect(() => {
    if (!edition || screen !== "room") return;
    if (isSampleEdition(edition.id) || hasManuscriptPages) {
      setEbookLicense(isSampleEdition(edition.id) ? "pagina-original" : "inklyst-manuscript");
      return;
    }
    if (!cloud || !edition.bookId) {
      setEbookLicense(null);
      return;
    }
    let cancelled = false;
    void import("@pagina/supabase").then(({ getEditionFile }) =>
      getEditionFile(supabase, edition.bookId).then((file) => {
        if (cancelled) return;
        setEbookLicense(file?.licensee ?? null);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [cloud, edition?.id, edition?.bookId, screen, hasManuscriptPages]);
  const transition = reduce
    ? { duration: 0 }
    : { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const };

  const ranked = rankCircle(
    circle.length
      ? circle.map((entry) => ({
          userId: entry.userId,
          xp:
            entry.xp +
            (checked && entry.userId === (profile?.display_name || "Tu") ? xpAmount("showed_up") : 0),
        }))
      : [{ userId: profile?.display_name || "Tu", xp: checked ? xpAmount("showed_up") : 0 }],
  );

  const receipt =
    checked && edition
      ? toPublicProcess({
          kind: "reading_check_in",
          title: edition.title,
          page,
          noteBody: "isto não pode sair",
        })
      : null;

  const shelf = useMemo(() => {
    const muted = getMutePrefs();
    const needle = query.trim().toLowerCase();
    let list = editions.filter((item) => !isMuted(item, muted));
    if (readerTab === "biblioteca" && libraryFilter !== "all") {
      const ids = new Set(libraryByStatus(libraryFilter).map((item) => item.editionId));
      list = list.filter((item) => ids.has(item.id));
    }
    if ((readerTab === "explorar" || readerTab === "inicio") && browseGenre) {
      list = editionsByGenre(list, browseGenre);
    }
    if (!needle) return list;
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(needle) ||
        item.penName.toLowerCase().includes(needle) ||
        item.pitch.toLowerCase().includes(needle) ||
        (item.tags ?? []).some((tag) => tag.toLowerCase().includes(needle)) ||
        editionGenre(item).toLowerCase().includes(needle),
    );
  }, [editions, query, libraryFilter, readerTab, libTick, browseGenre, muteTick]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  function lessLike(work: ShelfEdition) {
    muteEdition(work.id, editionGenre(work), work.tags);
    setMuteTick((value) => value + 1);
    flash("Vamos mostrar menos histórias assim.");
  }

  function addToLibrary(work: ShelfEdition) {
    persistLibrary(work.id, getProgress(work.id)?.page ?? 1, 0, "want");
    flash("Adicionado à biblioteca (Quero ler).");
  }

  const readingNow = useMemo(() => {
    const ids = libraryByStatus("reading").map((item) => item.editionId);
    return editions.filter((item) => ids.includes(item.id)).slice(0, 8);
  }, [editions, libTick]);

  const genreRails = useMemo(() => {
    const muted = getMutePrefs();
    const visible = editions.filter((item) => !isMuted(item, muted));
    const rails: { genre: string; items: ShelfEdition[] }[] = [];
    for (const genre of ["Romance", "Thriller", "Não-ficção", "Fantasia"] as const) {
      const items = editionsByGenre(visible, genre).slice(0, 10);
      if (items.length) rails.push({ genre, items });
    }
    return rails;
  }, [editions, muteTick]);

  const commentCounts = useMemo(() => {
    if (!editionId) return new Map<number, number>();
    return countLocalParaComments(editionId, page);
  }, [editionId, page, commentTick]);

  const localLists = listLocalLists();
  const localReviews = edition ? listLocalReviews(edition.id) : [];
  const allReviews = listLocalReviews();

  function persistLibrary(
    editionKey: string,
    nextPage: number,
    nextParagraph: number,
    status: "reading" | "want" | "finished" = "reading",
  ) {
    setLibraryEntry({
      editionId: editionKey,
      page: nextPage,
      paragraph: nextParagraph,
      status,
      updatedAt: Date.now(),
    });
    saveProgress({ editionId: editionKey, page: nextPage, paragraph: nextParagraph });
    setLibTick((value) => value + 1);
    if (cloud && userId && !isSampleEdition(editionKey)) {
      void import("@pagina/supabase").then(({ upsertReadingProgress }) =>
        upsertReadingProgress(supabase, {
          userId,
          editionId: editionKey,
          page: nextPage,
          paragraph: nextParagraph,
          status,
        }),
      );
    }
  }

  function openDetail(id: string) {
    setEditionId(id);
    setScreen("detail");
    setSpace("reader", { edition: id, persist: true });
  }

  function openEdition(id: string) {
    const saved = getProgress(id) ?? getLibraryMap()[id];
    const pageNum = saved?.page ?? 1;
    const paraNum = "paragraph" in (saved ?? {}) ? (saved as { paragraph: number }).paragraph : 0;
    setEditionId(id);
    setPage(pageNum);
    setParagraph(paraNum);
    setChecked(false);
    setPaper(false);
    setScreen("room");
    setReaderTab("inicio");
    setSpace("reader", { edition: id, persist: true });
    persistLibrary(id, pageNum, paraNum, "reading");
  }

  function goToPage(next: number) {
    if (!edition) return;
    const clamped = Math.max(1, Math.min(pages.length || 1, next));
    setPage(clamped);
    setParagraph(0);
    setChecked(false);
    persistLibrary(edition.id, clamped, 0, "reading");
  }

  function onParagraphChange(index: number) {
    if (!edition || index === paragraph) return;
    setParagraph(index);
    persistLibrary(edition.id, page, index, "reading");
  }

  function markStatus(status: "reading" | "want" | "finished") {
    if (!edition) return;
    persistLibrary(edition.id, page, paragraph, status);
  }

  function openDemoSample() {
    setEditions((list) => mergeSampleBooks(list));
    openEdition(DEMO.id);
  }

  async function refreshCloudShelf() {
    const local = listReadableEditions();
    if (!cloud) {
      setEditions(mergeCatalog(local));
      return;
    }
    setEditions(mergeCatalog(local, await loadCloudEditions()));
  }

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    if (cloud) {
      const found = await unlockCloudEdition(invite);
      if (found) {
        setInviteError(null);
        setInvite("");
        setEditions((list) => (list.some((item) => item.id === found.id) ? list : [found, ...list]));
        openEdition(found.id);
        return;
      }
      if (userId) {
        const joined = await joinPair(invite, userId);
        if (joined.pair) {
          setInviteError(null);
          setInvite("");
          setPair(joined.pair);
          setPairInvite(joined.pair.invite_code);
          const match = await loadEditionForWork(joined.pair.work_id);
          await refreshCloudShelf();
          if (match) {
            setEditions((list) =>
              list.some((item) => item.id === match.id) ? list : [match, ...list],
            );
            openEdition(match.id);
          } else {
            setScreen("room");
          }
          return;
        }
      }
      setInviteError("Código inválido.");
      return;
    }
    const found = unlockWithCode(invite);
    if (!found) {
      setInviteError("Código inválido.");
      return;
    }
    setInviteError(null);
    setInvite("");
    await refreshCloudShelf();
    openEdition(found.id);
  }

  async function submitFollow(event: FormEvent) {
    event.preventDefault();
    const target = followId.trim();
    if (!userId || !target || followBusy) return;
    setFollowBusy(true);
    setFollowError(null);
    try {
      const result = await followSomeone(userId, target);
      if (result.error) {
        setFollowError(result.error);
        return;
      }
      setFollowId("");
      const ranks = await loadCircle();
      setCircle(
        ranks.length
          ? ranks.map((row) => ({ userId: row.name, xp: row.xp }))
          : [{ userId: profile?.display_name || "Tu", xp: 0 }],
      );
    } finally {
      setFollowBusy(false);
    }
  }

  const continueId = mostRecentProgress(editions)?.editionId;
  const continueBook =
    (continueId ? editions.find((item) => item.id === continueId) : null) ?? shelf[0] ?? null;
  const continueProgress = continueBook
    ? progressLabel(continueBook.id, continueBook.pages.length)
    : null;
  const greetName =
    profile?.display_name?.trim() ||
    user?.email?.split("@")[0] ||
    "aí";

  return (
    <main className={screen === "room" ? "rd rd-immersive" : "rd"}>
      <div className="rd-grain" aria-hidden />

      {screen === "home" ? (
        <>
          <header className="reader-topnav">
            <button type="button" className="rd-mark" onClick={() => { setScreen("home"); setReaderTab("inicio"); }}>
              <img src="/logo.png" alt="" width={36} height={36} draggable={false} />
              Inklyst
            </button>
            <nav className="reader-nav-links" aria-label="Reader">
              {(
                [
                  ["inicio", "Início"],
                  ["explorar", "Explorar"],
                  ["biblioteca", "Biblioteca"],
                  ["comunidade", "Comunidade"],
                  ["perfil", "Perfil"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={readerTab === id ? "on" : undefined}
                  onClick={() => {
                    setReaderTab(id);
                    if (id !== "explorar") setBrowseOpen(false);
                  }}
                >
                  {label}
                </button>
              ))}
              <div className="rd-browse-wrap">
                <button
                  type="button"
                  className={browseOpen ? "on" : undefined}
                  onClick={() => {
                    setReaderTab("explorar");
                    setBrowseOpen((value) => !value);
                  }}
                >
                  Géneros <ChevronDown size={14} />
                </button>
                {browseOpen ? (
                  <div className="rd-browse-menu" role="menu">
                    <div className="rd-browse-cols">
                      <p className="eyebrow">Explorar</p>
                      <div className="rd-browse-grid">
                        {BROWSE_GENRES.map((genre) => (
                          <button
                            key={genre}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setBrowseGenre(genre);
                              setBrowseOpen(false);
                              setReaderTab("explorar");
                            }}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rd-browse-picks">
                      <p className="eyebrow">Escolhas Inklyst</p>
                      {SENSATION_CHIPS.map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => {
                            setBrowseGenre(chip.genre);
                            setBrowseOpen(false);
                            setReaderTab("explorar");
                          }}
                        >
                          {chip.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setBrowseGenre(null);
                          setBrowseOpen(false);
                        }}
                      >
                        Ver tudo
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </nav>
            <div className="reader-nav-actions">
              <button type="button" className="reader-create-btn" onClick={onOpenCreate}>
                + Criar
              </button>
              <SpaceSwitcher />
              {configured ? (
                <button
                  type="button"
                  className="rd-nav-btn"
                  aria-label="Sair"
                  title={profile?.display_name || user?.email || "Sair"}
                  onClick={() => void signOut()}
                >
                  <LogOut size={16} />
                </button>
              ) : null}
            </div>
          </header>

          <div className="rd-home">
            {(readerTab === "inicio" || readerTab === "explorar") ? (
              <>
            <header className="rd-home-head">
              <div>
                <p className="rd-home-greet">{greetingLine(greetName)}</p>
                <h1>{readerTab === "explorar" ? "Explorar" : "A tua leitura"}</h1>
              </div>
              <form className="rd-invite compact" onSubmit={(event) => void submitInvite(event)}>
                <input
                  value={invite}
                  placeholder={cloud ? "Código beta ou par" : "Código beta"}
                  aria-label="Código de convite"
                  onChange={(event) => {
                    setInvite(event.target.value);
                    setInviteError(null);
                  }}
                />
                <button type="submit">Entrar</button>
              </form>
            </header>
            {inviteError ? <p className="rd-invite-error">{inviteError}</p> : null}

            {readerTab === "inicio" && continueBook ? (
              <button
                type="button"
                className="rd-continue-card"
                onClick={() => openDetail(continueBook.id)}
              >
                <span
                  className="rd-continue-cover"
                  style={
                    {
                      "--hue": String(continueBook.coverHue || 24),
                      backgroundImage: continueBook.coverImage
                        ? `url(${continueBook.coverImage})`
                        : undefined,
                    } as CSSProperties
                  }
                  aria-hidden
                />
                <span className="rd-continue-copy">
                  <small>Continua a tua história</small>
                  <strong>{continueBook.title}</strong>
                  <span>
                    {continueBook.penName || "Inklyst"}
                    {continueProgress
                      ? ` · ${continueProgress}`
                      : ` · ${continueBook.pages.length} páginas`}
                  </span>
                </span>
                <span className="rd-continue-arrow" aria-hidden>
                  <ArrowRight size={18} />
                </span>
              </button>
            ) : null}

            {readerTab === "inicio" ? (
            <>
            <section className="rd-home-block" aria-label="Sensação">
              <p className="eyebrow">Escolhe pela sensação</p>
              <div className="reader-sensations">
                {SENSATION_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className={browseGenre === chip.genre ? "lib-chip on" : "lib-chip"}
                    onClick={() => {
                      setBrowseGenre(chip.genre);
                      setReaderTab("explorar");
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </section>
            <section className="rd-home-block" aria-label="A continuar">
              <div className="rd-section-head">
                <div>
                  <p className="eyebrow">Continuar</p>
                  <h2>A ler agora</h2>
                </div>
              </div>
              {readingNow.length || continueBook ? (
                <div className="rd-rail">
                  {(readingNow.length ? readingNow : continueBook ? [continueBook] : []).map((work) => (
                    <button
                      key={work.id}
                      type="button"
                      className="rd-rail-card"
                      onClick={() => openDetail(work.id)}
                    >
                      <span
                        className="rd-rail-cover"
                        style={
                          {
                            "--hue": String(work.coverHue || 24),
                            backgroundImage: work.coverImage ? `url(${work.coverImage})` : undefined,
                          } as CSSProperties
                        }
                      />
                      <span>
                        <strong>{work.title}</strong>
                        <small>{progressLabel(work.id, work.pages.length) || formatParts(work)}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rd-continue-empty">
                  <p>As histórias que estiveres a ler aparecem aqui.</p>
                  <button
                    type="button"
                    className="rd-btn primary"
                    onClick={() => setReaderTab("explorar")}
                  >
                    <Search size={15} /> Explorar histórias
                  </button>
                </div>
              )}
            </section>
            {genreRails.map((rail) => (
              <section key={rail.genre} className="rd-home-block">
                <div className="rd-section-head">
                  <div>
                    <p className="eyebrow">Género</p>
                    <h2>
                      <button
                        type="button"
                        className="rd-link-title"
                        onClick={() => {
                          setBrowseGenre(rail.genre);
                          setReaderTab("explorar");
                        }}
                      >
                        {rail.genre} <ArrowRight size={16} />
                      </button>
                    </h2>
                  </div>
                </div>
                <div className="rd-rail">
                  {rail.items.map((work) => (
                    <button
                      key={work.id}
                      type="button"
                      className="rd-rail-card tall"
                      onClick={() => openDetail(work.id)}
                    >
                      <span
                        className="rd-rail-cover"
                        style={
                          {
                            "--hue": String(work.coverHue || 24),
                            backgroundImage: work.coverImage ? `url(${work.coverImage})` : undefined,
                          } as CSSProperties
                        }
                      />
                      <span className="rd-rail-tag">{(work.tags?.[0] || editionGenre(work)).toLowerCase()}</span>
                      <strong>{work.title}</strong>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            </>
            ) : readerTab === "explorar" ? (
              <section className="rd-home-block">
                <p className="eyebrow">Descobrir</p>
                <h2>{browseGenre ? browseGenre : "Novos e amostras"}</h2>
                <p className="fine">
                  {browseGenre
                    ? `Histórias em ${browseGenre}. Toca numa capa para ver a ficha.`
                    : "Histórias públicas e betas — toca numa capa para ver a ficha."}
                </p>
                {browseGenre ? (
                  <button type="button" className="lib-chip" onClick={() => setBrowseGenre(null)}>
                    Limpar filtro
                  </button>
                ) : null}
              </section>
            ) : null}
              </>
            ) : null}

            {readerTab === "perfil" ? (
              <ProfileView
                greetName={greetName}
                profileHandle={profileHandle}
                profileBio={profileBio}
                onHandleChange={setProfileHandle}
                onBioChange={setProfileBio}
                onSave={() => {
                  localStorage.setItem(
                    "inklyst.public_profile",
                    JSON.stringify({ handle: profileHandle, bio: profileBio }),
                  );
                  if (cloud && userId) {
                    void import("@pagina/supabase").then(({ updatePublicProfile }) =>
                      updatePublicProfile(supabase, userId, {
                        handle: profileHandle,
                        bio: profileBio,
                        isPublic: true,
                      }),
                    );
                  }
                }}
                editions={editions}
                lists={localLists}
                reviews={allReviews}
                circle={ranked}
                listTitle={listTitle}
                onListTitleChange={setListTitle}
                onCreateList={(event) => {
                  event.preventDefault();
                  if (!listTitle.trim()) return;
                  const list = createLocalList(listTitle.trim());
                  setListTitle("");
                  setLibTick((value) => value + 1);
                  if (cloud && userId) {
                    void import("@pagina/supabase").then(({ createBookList }) =>
                      createBookList(supabase, {
                        ownerId: userId,
                        title: list.title,
                      }),
                    );
                  }
                }}
                cloud={cloud}
                userId={userId}
                followId={followId}
                followBusy={followBusy}
                followError={followError}
                onFollowIdChange={(value) => {
                  setFollowId(value);
                  setFollowError(null);
                }}
                onFollow={(event) => void submitFollow(event)}
                onOpenEdition={openDetail}
              />
            ) : null}

            {(readerTab === "explorar" || readerTab === "biblioteca") ? (
          <section className="rd-home-block" id="biblioteca" aria-label="Biblioteca">
            <div className="rd-section-head">
              <div>
                <p className="eyebrow">{readerTab === "explorar" ? "Catálogo" : "Biblioteca"}</p>
                <h2>{readerTab === "explorar" ? "Tudo o que podes abrir" : "A tua estante"}</h2>
              </div>
              <label className="rd-search">
                <Search size={15} />
                <input
                  value={query}
                  placeholder="Procurar"
                  aria-label="Procurar livros"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>
            {readerTab === "biblioteca" ? (
              <div className="reader-sensations" role="tablist" aria-label="Estado">
                {(
                  [
                    ["all", "Tudo"],
                    ["reading", "A ler"],
                    ["want", "Quero ler"],
                    ["finished", "Concluídos"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={libraryFilter === id ? "lib-chip on" : "lib-chip"}
                    onClick={() => setLibraryFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {shelf.length ? (
              <div className="rd-shelf">
                {shelf.map((work, index) => (
                  <EditionCard
                    key={work.id}
                    work={work}
                    index={index}
                    reduce={reduce}
                    onOpen={() => openDetail(work.id)}
                    onRead={() => openEdition(work.id)}
                    onAddLibrary={() => addToLibrary(work)}
                    onLessLike={() => lessLike(work)}
                  />
                ))}
              </div>
            ) : (
              <div className="rd-empty">
                <p>
                  {query.trim()
                    ? "Nenhum livro nesta pesquisa."
                    : readerTab === "biblioteca" && libraryFilter !== "all"
                      ? "Nada neste estado ainda. Abre um livro e marca A ler / Quero ler / Concluído."
                    : cloud
                      ? "Ainda não há edições. Publica no Studio com a mesma conta — ou toca em + Criar."
                      : "A biblioteca está vazia. Publica no Studio neste browser, ou abre a amostra."}
                </p>
                {!query.trim() ? (
                  <button type="button" className="rd-btn primary" onClick={openDemoSample}>
                    Abrir amostra
                  </button>
                ) : null}
              </div>
            )}
          </section>
            ) : null}

            {readerTab === "comunidade" ? (
          <section className="rd-home-block rd-circle-band" id="comunidade" aria-label="Comunidade">
            <p className="eyebrow">Comunidade</p>
            <h2>Quem lê perto de ti</h2>
            <ol className="rd-circle">
              {ranked.map((entry) => (
                <li key={entry.userId}>
                  <span className="rd-avatar">{entry.userId.slice(0, 1)}</span>
                  <span>{entry.userId}</span>
                  <span className="xp">{entry.xp}</span>
                </li>
              ))}
            </ol>
            {cloud && userId ? (
              <form className="follow-row" onSubmit={(event) => void submitFollow(event)}>
                <input
                  value={followId}
                  placeholder="ID ou nome exacto"
                  aria-label="Seguir utilizador"
                  onChange={(event) => {
                    setFollowId(event.target.value);
                    setFollowError(null);
                  }}
                />
                <button type="submit" disabled={followBusy}>
                  Seguir
                </button>
              </form>
            ) : null}
            {followError ? <p className="fine" style={{ marginTop: 8 }}>{followError}</p> : null}
            <p className="hint" style={{ marginTop: 14 }}>
              {cloud
                ? "O círculo só mostra quem segues. A margem fica trancada até à página certa."
                : "Os livros de teste estão na biblioteca — publica no Studio para veres as tuas edições."}
            </p>
          </section>
            ) : null}
          </div>
        </>
      ) : null}

      {toast ? <p className="rd-toast" role="status">{toast}</p> : null}

      <GenreOnboarding open={genreOpen && screen === "home"} onDone={() => setGenreOpen(false)} />

      {screen === "detail" && edition ? (
        <BookDetail
          edition={edition}
          catalog={editions}
          progressLabel={progressLabel(edition.id, edition.pages.length)}
          onBack={() => {
            setScreen("home");
            setSpace("reader", { edition: undefined, persist: true });
          }}
          onStart={() => openEdition(edition.id)}
          onOpenRelated={(id) => openDetail(id)}
          onWant={() => {
            persistLibrary(edition.id, getProgress(edition.id)?.page ?? 1, 0, "want");
          }}
        />
      ) : null}

      {screen === "detail" && !edition ? (
        <section className="rd-missing">
          <p className="fine">Esta edição não está disponível.</p>
          <button type="button" className="rd-btn primary" onClick={() => setScreen("home")}>
            Voltar
          </button>
        </section>
      ) : null}

      {screen === "room" && !edition ? (
        <section className="rd-missing">
          <p className="fine">Esta edição não está disponível.</p>
          <button type="button" className="rd-btn primary" onClick={() => setScreen("home")}>
            Voltar à biblioteca
          </button>
        </section>
      ) : null}

      {screen === "room" && edition ? (
        <section className={marginOpen ? "rd-room" : "rd-room margin-collapsed"} aria-label="Leitura">
          <header className="rd-room-bar">
            <button type="button" className="rd-nav-btn" onClick={() => setScreen("home")}>
              <ChevronLeft size={16} />
              Biblioteca
            </button>
            <div className="title-block">
              <strong>{edition.title}</strong>
              <small>
                {edition.visibility === "beta" ? "Beta · " : ""}
                {edition.penName || "Inklyst"}
                {partnerPage > 0 ? ` · parceiro na p. ${partnerPage}` : ""}
                {pairInvite ? ` · código ${pairInvite}` : ""}
              </small>
            </div>
            <div className="rd-room-tools">
              <button
                type="button"
                className="rd-nav-btn"
                aria-pressed={marginOpen}
                onClick={() => setMarginOpen((value) => !value)}
              >
                Margem
              </button>
              <div className="rd-modes" role="group" aria-label="Forma do livro">
                <button type="button" className={paper ? "on" : ""} onClick={() => setPaper(true)}>
                  Papel
                </button>
                <button type="button" className={paper ? "" : "on"} onClick={() => setPaper(false)}>
                  Digital
                </button>
              </div>
            </div>
          </header>

          <div className="rd-read-split">
            <section className="rd-stage" aria-label="A tua leitura">
              <div className="rd-page-meta">
                <p className="rd-page-kicker">
                  {page} / {pages.length || 1}
                </p>
                {pages.length ? (
                  <label className="rd-scrubber">
                    <input
                      type="range"
                      min={1}
                      max={pages.length}
                      value={Math.min(page, pages.length)}
                      aria-label="Progresso"
                      onChange={(event) => goToPage(Number(event.target.value))}
                    />
                  </label>
                ) : null}
              </div>

              <motion.article
                key={`${paper ? "paper" : "file"}-${edition.id}-${page}`}
                className={paper ? "rd-leaf paper-mode" : "rd-leaf"}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={transition}
              >
                {showDigitalText && pages.length ? (
                  <>
                    <TtsPlayer
                      text={pages[page - 1] ?? ""}
                      title={`${edition.title} · p. ${page}`}
                    />
                    <Prose
                      text={pages[page - 1] ?? ""}
                      restoreKey={`${edition.id}:${page}`}
                      restoreParagraph={paragraph}
                      onParagraphChange={onParagraphChange}
                      commentCounts={commentCounts}
                      onOpenParagraph={(index, excerpt) => setParaOpen({ index, excerpt })}
                    />
                  </>
                ) : showDigitalText ? (
                  <p className="hint">Sem texto nesta edição.</p>
                ) : (
                  <>
                    <p className="rd-folio">{page}</p>
                    <p className="hint">
                      {paper
                        ? "Modo papel: confirma a página com uma foto. Para ler o texto no ecrã, muda para Digital."
                        : "Esta edição ainda não tem texto digital. Publica de novo a partir do Studio, ou usa o modo Papel."}
                    </p>
                    {cloud && pair && userId ? (
                      <label className="rd-btn ghost" style={{ marginTop: 16, width: "fit-content" }}>
                        Fotografar página
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          hidden
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            setBusy(true);
                            void confirmPaperPage({
                              pairId: pair.id,
                              userId,
                              page,
                              file,
                              title: edition.title,
                            }).then((result) => {
                              setBusy(false);
                              if (!result.error) setChecked(true);
                            });
                          }}
                        />
                      </label>
                    ) : null}
                  </>
                )}
              </motion.article>

              <div className="rd-pager">
                <button
                  type="button"
                  className="rd-nav-btn"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="rd-nav-btn"
                  disabled={page >= pages.length}
                  onClick={() => goToPage(page + 1)}
                >
                  Seguinte
                </button>
              </div>

              <div className="rd-status-row">
                {(
                  [
                    ["reading", "A ler"],
                    ["want", "Quero ler"],
                    ["finished", "Concluído"],
                  ] as const
                ).map(([id, label]) => {
                  const current = getLibraryMap()[edition.id]?.status;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={current === id ? "lib-chip on" : "lib-chip"}
                      onClick={() => markStatus(id)}
                    >
                      {label}
                    </button>
                  );
                })}
                <button type="button" className="lib-chip" onClick={() => setIdeaOpen(true)}>
                  Inspirou-me
                </button>
                {localLists[0] ? (
                  <button
                    type="button"
                    className="lib-chip"
                    onClick={() => addEditionToLocalList(localLists[0]!.id, edition.id)}
                  >
                    + Lista
                  </button>
                ) : null}
              </div>

              <div className="rd-stage-actions">
                <button
                  type="button"
                  className="rd-check"
                  disabled={busy}
                  onClick={() => {
                    persistLibrary(edition.id, page, paragraph, "reading");
                    if (!cloud || !pair || !userId) {
                      setChecked(true);
                      return;
                    }
                    setBusy(true);
                    void checkInPage({
                      pairId: pair.id,
                      userId,
                      page,
                      title: edition.title,
                    }).then((result) => {
                      setBusy(false);
                      if (!result.error) setChecked(true);
                    });
                  }}
                >
                  <Send size={15} />
                  Check-in desta página
                </button>
                {receipt ? (
                  <p className="rd-receipt">
                    O círculo vê «{receipt.title}», página {receipt.page}. +{xpAmount("showed_up")}. A margem não
                    vai.
                  </p>
                ) : null}
              </div>

              <form
                className="rd-review-box"
                onSubmit={(event) => {
                  event.preventDefault();
                  upsertLocalReview({
                    editionId: edition.id,
                    rating: reviewDraft.rating,
                    body: reviewDraft.body,
                  });
                  if (cloud && userId && !isSampleEdition(edition.id)) {
                    void import("@pagina/supabase").then(({ upsertReview }) =>
                      upsertReview(supabase, {
                        authorId: userId,
                        editionId: edition.id,
                        rating: reviewDraft.rating,
                        body: reviewDraft.body,
                      }),
                    );
                  }
                  setReviewDraft({ rating: 5, body: "" });
                }}
              >
                <p className="eyebrow">Review</p>
                <div className="rd-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={reviewDraft.rating >= star ? "on" : ""}
                      onClick={() => setReviewDraft((value) => ({ ...value, rating: star }))}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewDraft.body}
                  placeholder="A tua opinião (pública no perfil)"
                  rows={2}
                  onChange={(event) =>
                    setReviewDraft((value) => ({ ...value, body: event.target.value }))
                  }
                />
                <button type="submit" className="rd-nav-btn">
                  Publicar review
                </button>
                {localReviews[0] ? (
                  <p className="fine">
                    Última: {localReviews[0].rating}★ — {localReviews[0].body || "sem texto"}
                  </p>
                ) : null}
              </form>
            </section>

            <aside className="rd-margin" aria-label="Margem partilhada">
              <p className="rail-label">Margem</p>
              <div className="rd-notes">
                {notes.map((note) => {
                  const mine = note.author === "Tu" || note.authorId === userId;
                  const open = canReadMargin({
                    readerPage: page,
                    anchorPage: note.anchorPage,
                    isAuthor: Boolean(mine),
                  });
                  return (
                    <article key={note.id} className={mine ? "rd-note mine" : "rd-note"}>
                      <header>
                        <span className="rd-avatar" aria-hidden>
                          {note.author.slice(0, 1)}
                        </span>
                        <span>{note.author}</span>
                        <span className="page-tag">p. {note.anchorPage}</span>
                      </header>
                      <AnimatePresence mode="wait" initial={false}>
                        {open ? (
                          <motion.p
                            key="open"
                            initial={reduce ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={transition}
                          >
                            {note.body}
                          </motion.p>
                        ) : (
                          <motion.p key="sealed" className="locked">
                            <Lock size={13} />
                            Abre na página {note.anchorPage}.
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </article>
                  );
                })}
              </div>

              <form
                className="rd-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!noteDraft.trim()) return;
                  if (isSampleEdition(edition.id)) {
                    const body = noteDraft.trim();
                    setNoteDraft("");
                    setNotes((list) => [
                      ...list,
                      {
                        id: `local-${Date.now()}`,
                        author: "Tu",
                        anchorPage: page,
                        body,
                      },
                    ]);
                    return;
                  }
                  if (cloud && pair && userId) {
                    void postMarginNote({
                      pairId: pair.id,
                      userId,
                      page,
                      body: noteDraft,
                    }).then(async (result) => {
                      if (result.error || !result.note) return;
                      setNoteDraft("");
                      const room = await roomState(pair, userId);
                      setNotes(
                        room.notes.map((note) => ({
                          id: note.id,
                          author: note.author_id === userId ? "Tu" : note.author_name,
                          authorId: note.author_id,
                          anchorPage: note.anchor_page,
                          body: note.body,
                        })),
                      );
                    });
                    return;
                  }
                  addMarginNote({
                    editionId: edition.id,
                    author: "Tu",
                    anchorPage: page,
                    body: noteDraft,
                  });
                  setNoteDraft("");
                  setNotes(
                    notesForEdition(edition.id).map((note) => ({
                      id: note.id,
                      author: note.author,
                      anchorPage: note.anchorPage,
                      body: note.body,
                    })),
                  );
                }}
              >
                <input
                  value={noteDraft}
                  placeholder="Nota nesta página…"
                  aria-label="Nota de margem"
                  onChange={(event) => setNoteDraft(event.target.value)}
                />
                <button type="submit" aria-label="Enviar nota">
                  <Send size={15} />
                </button>
              </form>

              <p className="rail-label" style={{ marginTop: 22 }}>
                Círculo
              </p>
              <ol className="circle">
                {ranked.map((entry, index) => (
                  <li key={entry.userId}>
                    <span className="rd-avatar">{entry.userId.slice(0, 1)}</span>
                    <span className="who">
                      {entry.userId}
                      {index === 0 ? <em> à frente</em> : null}
                    </span>
                    <span className="xp">{entry.xp}</span>
                  </li>
                ))}
              </ol>
              {cloud && userId ? (
                <form className="follow-row" onSubmit={(event) => void submitFollow(event)}>
                  <input
                    value={followId}
                    placeholder="ID ou nome"
                    aria-label="Seguir utilizador"
                    onChange={(event) => {
                      setFollowId(event.target.value);
                      setFollowError(null);
                    }}
                  />
                  <button type="submit" disabled={followBusy}>
                    Seguir
                  </button>
                </form>
              ) : null}
              {followError ? <p className="fine" style={{ marginTop: 8 }}>{followError}</p> : null}
            </aside>
          </div>
        </section>
      ) : null}

      {edition && paraOpen ? (
        <ParagraphSheet
          open
          onClose={() => setParaOpen(null)}
          editionId={edition.id}
          page={page}
          paragraph={paraOpen.index}
          excerpt={paraOpen.excerpt}
          authorName={profile?.display_name || greetName}
          userId={userId}
          cloud={cloud && !isSampleEdition(edition.id)}
          onCountsChange={() => setCommentTick((value) => value + 1)}
        />
      ) : null}

      {ideaOpen && edition ? (
        <div className="para-sheet-scrim" role="dialog" aria-modal>
          <div className="para-sheet">
            <header className="para-sheet-head">
              <button type="button" className="icon-btn tiny" aria-label="Fechar" onClick={() => setIdeaOpen(false)}>
                ×
              </button>
              <strong>Inspirou-me uma ideia</strong>
              <span />
            </header>
            <p className="fine">
              Guarda a tua ideia — não o texto do autor. Fica em Ideias no Studio.
            </p>
            <p className="para-sheet-quote">Durante «{edition.title}»</p>
            <textarea
              value={ideaDraft}
              rows={4}
              placeholder="E se uma pessoa descobrisse que…"
              onChange={(event) => setIdeaDraft(event.target.value)}
            />
            <button
              type="button"
              className="rd-btn primary"
              style={{ marginTop: 12, width: "100%" }}
              disabled={!ideaDraft.trim()}
              onClick={() => {
                const body = ideaDraft.trim();
                addLocalIdea({
                  body,
                  sourceEditionId: edition.id,
                  sourceTitle: edition.title,
                  sourceExcerpt: "",
                });
                if (cloud && userId) {
                  void import("@pagina/supabase").then(({ insertWritingIdea }) =>
                    insertWritingIdea(supabase, {
                      ownerId: userId,
                      body,
                      sourceEditionId: isSampleEdition(edition.id) ? undefined : edition.id,
                      sourceTitle: edition.title,
                    }),
                  );
                }
                setIdeaDraft("");
                setIdeaOpen(false);
                window.dispatchEvent(new CustomEvent("inklyst:ideas-updated"));
              }}
            >
              Guardar nas Ideias
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
