import {
  parseAdvisorNote,
  plainText,
  wordsInNodes,
  type AdvisorNote,
  type TranslationRecord,
} from "@pagina/domain";

export type DocStatus = "ideia" | "rascunho" | "revisao" | "fechado";
export type DocLabel = "cena" | "viragem" | "personagem" | "lugar" | "seccao" | "artigo" | "estrofe";
export type BookKind = "conto" | "novela" | "romance" | "poesia" | "prosa" | "livro" | "direito";
export type StoryType = "fiction" | "fanfic" | "nonfiction" | "poetry" | "prose" | "legal";

export const STORY_TYPE_LABEL: Record<StoryType, string> = {
  fiction: "Ficção",
  fanfic: "Fanfic",
  poetry: "Poesia",
  prose: "Prosa",
  nonfiction: "Não-ficção",
  legal: "Direito",
};

/** Flat list for legacy selects; prefer genresFor(mode) from projectMode. */
export const STORY_GENRES = [
  "Romance",
  "Thriller",
  "Fantasia",
  "Mistério",
  "Drama",
  "Histórico",
  "Terror",
  "Aventura",
  "Contemporâneo",
  "Poesia",
  "Lírica",
  "Crónica",
  "Ensaio",
  "Biografia",
  "Doutrina",
  "Manual académico",
  "Geral",
] as const;
export type SheetKind =
  | "nota"
  | "pessoa"
  | "lugar"
  | "organizacao"
  | "evento"
  | "objeto";

export type Cover = {
  hue: number;
  image?: string;
};

export const COVER_HUES = [24, 208, 18, 152, 32, 48];

export type Snapshot = {
  id: string;
  at: string;
  words: number;
  body: string;
  kind?: "autosave" | "manual" | "pre-ai" | "rewrite";
  label?: string;
};

export type Scene = {
  id: string;
  title: string;
  body: string;
  synopsis: string;
  notes: string;
  status: DocStatus;
  snapshots: Snapshot[];
};

export type Chapter = {
  id: string;
  title: string;
  body: string;
  synopsis: string;
  notes: string;
  status: DocStatus;
  label: DocLabel;
  partId: string | null;
  scenes: Scene[];
  activeSceneId: string | null;
  snapshots: Snapshot[];
  advisor?: AdvisorNote;
  /** Cartão de estrutura */
  objective?: string;
  conflict?: string;
  reveal?: string;
  tension?: number;
};

export type Part = {
  id: string;
  title: string;
};

export type RelationTone = "amor" | "amigo" | "conflito" | "familia" | "segredo" | "outro";

export type CharacterLink = {
  toId: string;
  label: string;
  tone?: RelationTone | string;
};

export type ManuscriptComment = {
  id: string;
  chapterId: string;
  anchor: string;
  body: string;
  author: string;
  at: number;
  resolved?: boolean;
};

export type ResearchNote = {
  id: string;
  title: string;
  body: string;
  kind: SheetKind;
  when?: string;
  where?: string;
  age?: string;
  role?: string;
  arc?: string;
  goal?: string;
  fear?: string;
  secret?: string;
  from?: string;
  to?: string;
  links?: CharacterLink[];
};

export type TimelineEvent = {
  id: string;
  title: string;
  when: string;
  note: string;
  linkedIds: string[];
  /** Capítulos onde o acontecimento aparece */
  chapterIds?: string[];
};

export type StoryBible = {
  era: string;
  places: string[];
  themes: string[];
  narrator: string;
  tone: string;
  rules: string[];
  truths: string[];
};

export type MemoryCandidate = {
  id: string;
  text: string;
  chapterId: string;
  chapterTitle: string;
  at: number;
  status: "pending" | "accepted" | "dismissed";
};

export type WriteSessionLog = {
  id: string;
  at: number;
  words: number;
  minutes: number;
  chapterId: string;
  goal: number;
};

export type WordDay = {
  day: string;
  words: number;
};

export type Book = {
  id: string;
  title: string;
  penName: string;
  pitch: string;
  kind: BookKind;
  cover: Cover;
  targetWords: number;
  sessionTarget: number;
  dailyTarget: number;
  weeklyTarget: number;
  status: DocStatus;
  folder?: string;
  openedAt: number;
  savedAt: number;
  activeChapterId: string;
  parts: Part[];
  chapters: Chapter[];
  trash: Chapter[];
  research: ResearchNote[];
  timeline: TimelineEvent[];
  wordLog: WordDay[];
  translations: Record<string, TranslationRecord | undefined>;
  advisor: AdvisorNote;
  bible: StoryBible;
  memory: MemoryCandidate[];
  sessionLog: WriteSessionLog[];
  writeStreak: number;
  comments: ManuscriptComment[];
  /** Bumps on each local write; used to detect remote conflicts */
  revision: number;
  remoteSavedAt?: number;
  /** Discovery metadata for publish / Reader ficha */
  storyType?: StoryType;
  tags?: string[];
  genres?: string[];
  language?: string;
  copyright?: string;
  mature?: boolean;
  published?: {
    editionId: string;
    visibility: "public" | "beta";
    betaCode: string;
    publishedAt: number;
  } | null;
};

export function blankBible(): StoryBible {
  return {
    era: "",
    places: [],
    themes: [],
    narrator: "",
    tone: "",
    rules: [],
    truths: [],
  };
}

export const STATUS_LABEL: Record<DocStatus, string> = {
  ideia: "Ideia",
  rascunho: "Rascunho",
  revisao: "Revisão",
  fechado: "Fechado",
};

export const LABEL_NAME: Record<DocLabel, string> = {
  cena: "Cena",
  viragem: "Viragem",
  personagem: "Personagem",
  lugar: "Lugar",
  seccao: "Secção",
  artigo: "Artigo",
  estrofe: "Estrofe",
};

export const KIND_LABEL: Record<BookKind, string> = {
  conto: "Conto",
  novela: "Novela",
  romance: "Romance (ficção)",
  poesia: "Livro de poemas",
  prosa: "Prosa / crónica",
  livro: "Livro (não-ficção)",
  direito: "Livro de direito",
};

export const SHEET_LABEL: Record<SheetKind, string> = {
  nota: "Nota",
  pessoa: "Pessoa",
  lugar: "Lugar",
  organizacao: "Organização",
  evento: "Evento",
  objeto: "Objeto",
};

export function coverFor(id: string): Cover {
  const known: Record<string, number> = {
    "casa-vazia": 332,
    "inverno-cais": 208,
    cartas: 24,
  };
  if (known[id] !== undefined) return { hue: known[id] };
  const index = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % COVER_HUES.length;
  return { hue: COVER_HUES[index] };
}

export const ADVISOR_LABEL: Record<AdvisorNote["kind"], string> = {
  question: "Pergunta",
  gap: "Lacuna",
  continuity: "Continuidade",
  return: "Regresso",
};

export function wordsOf(book: Book) {
  return wordsInNodes(book.chapters);
}

/** Prosa canónica do capítulo para cloud / tradução / export SQL (body + cenas). */
export function chapterCloudBody(chapter: Chapter): string {
  const scenes = (chapter.scenes ?? [])
    .map((scene) => `${scene.title || "Sem título"}\n\n${plainText(scene.body)}`.trim())
    .filter(Boolean)
    .join("\n\n");
  return [plainText(chapter.body).trim(), scenes].filter(Boolean).join("\n\n");
}

export function compiledText(book: Book) {
  return book.chapters
    .map((chapter) => {
      const body = chapterCloudBody(chapter);
      return `${chapter.title || "Sem título"}\n\n${body}`.trim();
    })
    .join("\n\n");
}

export function chapterOf(book: Book) {
  return (
    book.chapters.find((chapter) => chapter.id === book.activeChapterId) ??
    book.chapters[0]
  );
}

export function activeBody(chapter: Chapter) {
  if (!chapter.activeSceneId) return chapter.body;
  return chapter.scenes.find((scene) => scene.id === chapter.activeSceneId)?.body ?? chapter.body;
}

export function dayKey(at = Date.now()) {
  return new Date(at).toISOString().slice(0, 10);
}

function chapter(input: Omit<Chapter, "partId" | "scenes" | "activeSceneId"> & Partial<Pick<Chapter, "partId" | "scenes" | "activeSceneId">>): Chapter {
  return {
    partId: input.partId ?? null,
    scenes: input.scenes ?? [],
    activeSceneId: input.activeSceneId ?? null,
    ...input,
  };
}

export function blankScene(): Scene {
  return {
    id: crypto.randomUUID(),
    title: "Cena nova",
    body: "",
    synopsis: "",
    notes: "",
    status: "ideia",
    snapshots: [],
  };
}

export function blankPart(title = "Acto novo"): Part {
  return { id: crypto.randomUUID(), title };
}

export function seedBooks(now = Date.now()): Book[] {
  return [
    {
      id: "casa-vazia",
      title: "Casa vazia",
      penName: "",
      pitch: "Uma mulher que não tira o casaco do prego e uma cadeira que continua posta.",
      cover: { hue: 332 },
      kind: "novela",
      targetWords: 18000,
      sessionTarget: 300,
      dailyTarget: 400,
      weeklyTarget: 2500,
      status: "rascunho",
      openedAt: now,
      savedAt: now,
      activeChapterId: "cozinha",
      parts: [
        { id: "parte-casa", title: "A casa" },
        { id: "parte-rua", title: "A rua" },
      ],
      advisor: parseAdvisorNote({
        kind: "return",
        prompt: "Paraste na frase da chávena. O que é que ela ainda não disse?",
      }),
      chapters: [
        chapter({
          id: "cozinha",
          title: "A cozinha",
          partId: "parte-casa",
          body: "A chávena ainda está quente.\n\nEla pousou a mão no bordo e não bebeu. Lá fora, a rua fazia o barulho de sempre, e isso era o problema: nada tinha mudado, excepto a cadeira vazia.",
          synopsis: "Ela chega e não bebe. A cadeira vazia é a primeira coisa que a casa lhe devolve.",
          notes: "Não explicar de quem era a cadeira neste capítulo.",
          status: "revisao",
          label: "viragem",
          advisor: parseAdvisorNote({
            kind: "return",
            prompt: "Paraste na frase da chávena. O que é que ela ainda não disse?",
          }),
          scenes: [
            {
              id: "cena-porta",
              title: "A porta",
              body: "A chave rodou sem esforço. Isso também era novo.",
              synopsis: "Entra sem fazer barulho.",
              notes: "",
              status: "rascunho",
              snapshots: [],
            },
          ],
          snapshots: [
            {
              id: "snap-cozinha",
              at: "Ontem, 23:10",
              words: 12,
              body: "A chávena ainda está quente.\n\nEla não bebeu.",
            },
          ],
        }),
        chapter({
          id: "corredor",
          title: "O corredor",
          partId: "parte-casa",
          body: "O casaco continuava no prego. Ela passou por ele sem o tirar, como quem não quer acordar uma coisa.",
          synopsis: "O casaco fica. Ela atravessa o corredor sem o reconhecer em voz alta.",
          notes: "",
          status: "rascunho",
          label: "cena",
          snapshots: [],
        }),
        chapter({
          id: "janela",
          title: "A janela",
          partId: "parte-rua",
          body: "",
          synopsis: "O que se vê da cozinha quando a luz muda.",
          notes: "Ainda não sei se chove.",
          status: "ideia",
          label: "lugar",
          snapshots: [],
        }),
      ],
      trash: [],
      research: [
        {
          id: "ela",
          kind: "pessoa",
          title: "Ela",
          body: "Ainda sem nome. Não bebe o que está quente. Passa pelo casaco sem o tirar.",
          age: "",
          role: "Protagonista",
          goal: "Entrar na casa sem acordar o que ficou.",
          fear: "Que a chávena ainda esteja à espera dela.",
          secret: "Sabe quem arrumou a cadeira pela última vez.",
          from: "A rua",
          to: "A cozinha",
          links: [{ toId: "org-vizinhos", label: "vizinhos", tone: "tensão" }],
        },
        {
          id: "pesquisa-cadeira",
          kind: "lugar",
          title: "A cadeira",
          body: "Cadeira de pau, encostada à mesa, não arrumada. Ninguém a nomeia nos dois primeiros capítulos.",
        },
        {
          id: "pesquisa-rua",
          kind: "lugar",
          title: "A rua",
          body: "Barulho de tarde de semana. Eléctricos ao fundo, não à porta. A casa não é no centro.",
        },
        {
          id: "org-vizinhos",
          kind: "organizacao",
          title: "Os vizinhos do rés-do-chão",
          body: "Ouvidos. Nunca batem à porta. São a pressão de fora sem terem nome no texto.",
        },
        {
          id: "evt-partida",
          kind: "evento",
          title: "O dia em que a cadeira ficou",
          when: "Três semanas antes",
          body: "Alguém saiu. A casa não foi arrumada. Este evento ainda não tem cena própria.",
        },
        {
          id: "obj-chave",
          kind: "objeto",
          title: "A chave",
          body: "Roda sem esforço. Isso também era novo.",
        },
      ],
      timeline: [
        {
          id: "tl-1",
          title: "A cadeira fica",
          when: "Três semanas antes",
          note: "Ponto zero. Ainda não está no manuscrito.",
          linkedIds: ["evt-partida", "pesquisa-cadeira"],
          chapterIds: [],
        },
        {
          id: "tl-2",
          title: "Ela regressa",
          when: "Hoje, fim de tarde",
          note: "Abre na cozinha. A chávena ainda está quente.",
          linkedIds: ["cozinha", "ela"],
          chapterIds: ["cozinha"],
        },
      ],
      wordLog: [{ day: dayKey(now), words: 54 }],
      translations: {
        cozinha: {
          locale: "en",
          status: "machine_draft",
          body: "The cup is still warm.\n\nShe rested her hand on the rim and did not drink. Outside, the street made its usual noise, and that was the problem: nothing had changed, except the empty chair.",
        },
      },
      bible: {
        era: "Presente, fim de tarde",
        places: ["A cozinha", "O corredor", "A rua"],
        themes: ["Ausência", "Regresso", "Silêncio"],
        narrator: "Terceira pessoa limitada",
        tone: "Contido / tenso",
        rules: ["O leitor só descobre quem saiu através de objectos, nunca de exposição directa."],
        truths: ["A chávena ainda está quente quando ela entra.", "O casaco continua no prego."],
      },
      memory: [],
      sessionLog: [],
      writeStreak: 2,
      comments: [],
      revision: 1,
    },
    {
      id: "inverno-cais",
      title: "O inverno do cais",
      penName: "",
      pitch: "Um farol apagado e um homem que conta os barcos que não voltam.",
      cover: { hue: 208 },
      kind: "romance",
      targetWords: 70000,
      sessionTarget: 500,
      dailyTarget: 800,
      weeklyTarget: 5000,
      status: "rascunho",
      openedAt: now - 1000 * 60 * 60 * 26,
      savedAt: now - 1000 * 60 * 60 * 26,
      activeChapterId: "doca",
      parts: [],
      advisor: parseAdvisorNote({
        kind: "continuity",
        prompt: "O farol apagou no primeiro capítulo. Quem é que ainda o trata como se acendesse?",
      }),
      chapters: [
        chapter({
          id: "doca",
          title: "A doca",
          body: "A água batia no cimento com a pressa de quem quer ir embora. Ele contou três barcos e faltava um, o mesmo de todas as manhãs.",
          synopsis: "Manhã na doca. O quarto barco continua em falta.",
          notes: "O nome do barco só aparece no capítulo do farol.",
          status: "rascunho",
          label: "lugar",
          snapshots: [],
        }),
        chapter({
          id: "farol",
          title: "O farol apagado",
          body: "Do caminho via-se a torre, e via-se também que não havia luz nenhuma. Isso, para ele, ainda era uma notícia.",
          synopsis: "Ele sobe e confirma o que a vila já sabe.",
          notes: "",
          status: "ideia",
          label: "viragem",
          snapshots: [],
        }),
      ],
      trash: [],
      research: [
        {
          id: "ele",
          kind: "pessoa",
          title: "Ele",
          body: "Conta os barcos de manhã. Ainda trata o farol como se fosse acender.",
          role: "Protagonista",
          goal: "Saber o nome do quarto barco.",
          fear: "Que a vila já tenha aceite o farol apagado.",
          secret: "",
          links: [],
        },
        {
          id: "pesquisa-barcos",
          kind: "nota",
          title: "Os quatro barcos",
          body: "Três nomes já usados na vila. O quarto ainda não tem nome no texto.",
        },
      ],
      timeline: [],
      wordLog: [],
      translations: {
        doca: {
          locale: "en",
          status: "machine_draft",
          body: "The water struck the concrete in a hurry to leave. He counted three boats and one was missing, the same one as every morning.",
        },
      },
      bible: blankBible(),
      memory: [],
      sessionLog: [],
      writeStreak: 0,
      comments: [],
      revision: 0,
    },
    {
      id: "cartas",
      title: "Cartas sem selo",
      penName: "",
      pitch: "Cartas que ficam na gaveta porque o selo tornaria a frase verdadeira.",
      cover: { hue: 24 },
      kind: "conto",
      targetWords: 8000,
      sessionTarget: 200,
      dailyTarget: 250,
      weeklyTarget: 1500,
      status: "ideia",
      openedAt: now - 1000 * 60 * 60 * 80,
      savedAt: now - 1000 * 60 * 60 * 80,
      activeChapterId: "primeira-carta",
      parts: [],
      advisor: parseAdvisorNote({
        kind: "question",
        prompt: "Se a carta não vai sair da gaveta, para quem é que ela está a ser honesta?",
      }),
      chapters: [
        chapter({
          id: "primeira-carta",
          title: "A primeira carta",
          body: "Escreveu o nome e parou. O selo estava na mesa, ao lado, como uma decisão ainda não tomada.",
          synopsis: "Começa uma carta e não a fecha.",
          notes: "",
          status: "ideia",
          label: "personagem",
          snapshots: [],
        }),
      ],
      trash: [],
      research: [
        {
          id: "quem-escreve",
          kind: "pessoa",
          title: "Quem escreve",
          body: "O nome fica por escrever. A carta para quando o selo for uma decisão.",
          role: "Narrador",
          links: [],
        },
      ],
      timeline: [],
      wordLog: [],
      translations: {},
      bible: blankBible(),
      memory: [],
      sessionLog: [],
      writeStreak: 0,
      comments: [],
      revision: 0,
    },
  ];
}

const STORAGE_KEY = "pagina-write-v2";
const LEGACY_KEY = "pagina-write-v1";

export function loadBooks(): Book[] {
  if (typeof localStorage === "undefined") return seedBooks();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return seedBooks();
    const parsed = JSON.parse(raw) as { version?: number; books?: unknown };
    if (!Array.isArray(parsed.books)) return seedBooks();
    const books = parsed.books.map(revive);
    if (books.length === 0 || books.some((book) => book.chapters.length === 0)) return seedBooks();
    return books;
  } catch {
    return seedBooks();
  }
}

export function saveBooks(books: Book[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, books }));
}

function reviveChapter(item: Chapter): Chapter {
  return {
    ...item,
    synopsis: item.synopsis ?? "",
    notes: item.notes ?? "",
    snapshots: item.snapshots ?? [],
    partId: item.partId ?? null,
    scenes: (item.scenes ?? []).map((scene) => ({
      ...scene,
      synopsis: scene.synopsis ?? "",
      notes: scene.notes ?? "",
      snapshots: scene.snapshots ?? [],
      status: scene.status ?? "ideia",
    })),
    activeSceneId: item.activeSceneId ?? null,
    advisor: item.advisor ? parseAdvisorNote(item.advisor) : undefined,
    objective: item.objective ?? "",
    conflict: item.conflict ?? "",
    reveal: item.reveal ?? "",
    tension: typeof item.tension === "number" ? item.tension : undefined,
  };
}

function revive(value: unknown): Book {
  if (value === null || typeof value !== "object") throw new Error("book refused");
  const book = value as Book;
  const chapters = book.chapters.map(reviveChapter);
  return {
    ...book,
    advisor: parseAdvisorNote(book.advisor),
    chapters,
    penName: book.penName ?? "",
    cover: book.cover?.hue !== undefined ? book.cover : coverFor(book.id),
    trash: (book.trash ?? []).map(reviveChapter),
    parts: book.parts ?? [],
    research: (book.research ?? []).map((note) => ({
      ...note,
      kind: note.kind ?? "nota",
      when: note.when ?? "",
      where: note.where ?? "",
      age: note.age ?? "",
      role: note.role ?? "",
      arc: note.arc ?? "",
      goal: note.goal ?? "",
      fear: note.fear ?? "",
      secret: note.secret ?? "",
      from: note.from ?? "",
      to: note.to ?? "",
      links: note.links ?? [],
    })),
    timeline: (book.timeline ?? []).map((event) => ({
      ...event,
      chapterIds: event.chapterIds ?? [],
    })),
    wordLog: book.wordLog ?? [],
    dailyTarget: book.dailyTarget ?? 400,
    weeklyTarget: book.weeklyTarget ?? 2500,
    sessionTarget: book.sessionTarget ?? 300,
    savedAt: book.savedAt ?? book.openedAt ?? Date.now(),
    translations: book.translations ?? {},
    published: book.published ?? null,
    bible: {
      ...blankBible(),
      ...(book.bible ?? {}),
      places: book.bible?.places ?? [],
      themes: book.bible?.themes ?? [],
      rules: book.bible?.rules ?? [],
      truths: book.bible?.truths ?? [],
    },
    memory: book.memory ?? [],
    sessionLog: book.sessionLog ?? [],
    writeStreak: book.writeStreak ?? 0,
    comments: book.comments ?? [],
    revision: typeof book.revision === "number" ? book.revision : 0,
    remoteSavedAt: book.remoteSavedAt,
  };
}

function modeDefaults(storyType: StoryType): {
  kind: BookKind;
  targetWords: number;
  chapterTitle: string;
  label: DocLabel;
  advisorPrompt: string;
} {
  switch (storyType) {
    case "poetry":
      return {
        kind: "poesia",
        targetWords: 3_000,
        chapterTitle: "Poema 1",
        label: "estrofe",
        advisorPrompt: "Que imagem ou silêncio este poema ainda não ousou?",
      };
    case "prose":
      return {
        kind: "prosa",
        targetWords: 15_000,
        chapterTitle: "Texto 1",
        label: "seccao",
        advisorPrompt: "O que é que este texto ainda não disse com clareza?",
      };
    case "nonfiction":
      return {
        kind: "livro",
        targetWords: 40_000,
        chapterTitle: "Capítulo 1",
        label: "seccao",
        advisorPrompt: "Que argumento ou exemplo falta para o leitor acompanhar?",
      };
    case "legal":
      return {
        kind: "direito",
        targetWords: 60_000,
        chapterTitle: "Artigo 1",
        label: "artigo",
        advisorPrompt: "Que referência, excepção ou nuance jurídica falta aqui?",
      };
    case "fanfic":
      return {
        kind: "novela",
        targetWords: 20_000,
        chapterTitle: "Capítulo 1",
        label: "cena",
        advisorPrompt: "O que é que esta história ainda deve aos personagens e ao cânone?",
      };
    default:
      return {
        kind: "romance",
        targetWords: 50_000,
        chapterTitle: "Capítulo 1",
        label: "cena",
        advisorPrompt: "O que é que este livro ainda não te deixou escrever?",
      };
  }
}

export function blankBook(draft: {
  title: string;
  penName: string;
  pitch: string;
  kind: BookKind;
  cover: Cover;
  storyType?: StoryType;
  tags?: string[];
  genres?: string[];
  language?: string;
  copyright?: string;
  mature?: boolean;
}): Book {
  const id = crypto.randomUUID();
  const chapterId = crypto.randomUUID();
  const now = Date.now();
  const storyType = draft.storyType ?? "fiction";
  const defaults = modeDefaults(storyType);
  return {
    id,
    title: draft.title.trim() || "Sem título",
    penName: draft.penName.trim(),
    pitch: draft.pitch.trim(),
    kind: draft.kind || defaults.kind,
    cover: draft.cover,
    storyType,
    tags: draft.tags ?? [],
    genres: draft.genres ?? [],
    language: draft.language ?? "pt",
    copyright: draft.copyright ?? "all-rights",
    mature: draft.mature ?? false,
    targetWords: defaults.targetWords,
    sessionTarget: 300,
    dailyTarget: 400,
    weeklyTarget: 2500,
    status: "ideia",
    openedAt: now,
    savedAt: now,
    activeChapterId: chapterId,
    parts: [],
    advisor: parseAdvisorNote({
      kind: "question",
      prompt: defaults.advisorPrompt,
    }),
    chapters: [
      {
        id: chapterId,
        title: defaults.chapterTitle,
        body: "",
        synopsis: "",
        notes: "",
        status: "ideia",
        label: defaults.label,
        partId: null,
        scenes: [],
        activeSceneId: null,
        snapshots: [],
      },
    ],
    trash: [],
    research: [],
    timeline: [],
    wordLog: [],
    translations: {},
    published: null,
    bible: blankBible(),
    memory: [],
    sessionLog: [],
    writeStreak: 0,
    comments: [],
    revision: 0,
  };
}

export function blankChapter(): Chapter {
  return {
    id: crypto.randomUUID(),
    title: "Sem título",
    body: "",
    synopsis: "",
    notes: "",
    status: "ideia",
    label: "cena",
    partId: null,
    scenes: [],
    activeSceneId: null,
    snapshots: [],
    objective: "",
    conflict: "",
    reveal: "",
  };
}
