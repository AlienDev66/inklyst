import type { BookKind, StoryType } from "./books";

type BinderId =
  | "manuscript"
  | "structure"
  | "research"
  | "bible"
  | "timeline"
  | "relations"
  | "notes"
  | "progress"
  | "trash";

/** Vocabulary + structure for each project mode — not just a label. */
export type ProjectMode = {
  id: StoryType;
  label: string;
  blurb: string;
  partLabel: string;
  partLabelPlural: string;
  chapterLabel: string;
  chapterLabelPlural: string;
  sceneLabel: string;
  sceneLabelPlural: string;
  /** Scenes/sections under a chapter */
  usesScenes: boolean;
  usesWorld: boolean;
  usesTimeline: boolean;
  usesRelations: boolean;
  editorClass: "prose" | "verse" | "legal" | "essay";
  defaultKind: BookKind;
  defaultTargetWords: number;
  defaultChapterTitle: (index: number) => string;
  defaultPartTitle: (index: number) => string;
  defaultSceneTitle: (index: number) => string;
  genres: readonly string[];
  createHints: string[];
  binderExtra: BinderId[];
};

const FICTION_GENRES = [
  "Romance",
  "Thriller",
  "Fantasia",
  "Mistério",
  "Drama",
  "Histórico",
  "Terror",
  "Aventura",
  "Contemporâneo",
  "Fanfic",
] as const;

const POETRY_GENRES = [
  "Lírica",
  "Épica",
  "Soneto",
  "Haiku",
  "Slam",
  "Experimental",
  "Amor",
  "Social",
  "Espiritual",
  "Infantil",
] as const;

const PROSE_GENRES = [
  "Ensaio literário",
  "Crónica",
  "Conto literário",
  "Memórias",
  "Diário",
  "Cartas",
  "Microconto",
  "Prosa poética",
] as const;

const NONFICTION_GENRES = [
  "Biografia",
  "Ensaio",
  "História",
  "Ciência",
  "Auto-ajuda",
  "Negócios",
  "Viagem",
  "Educação",
  "Religião",
  "Geral",
] as const;

const LEGAL_GENRES = [
  "Doutrina",
  "Código anotado",
  "Manual académico",
  "Parecer",
  "Comentário",
  "Jurisprudência",
  "Tese / dissertação",
  "Guia prático",
] as const;

export const PROJECT_MODES: Record<StoryType, ProjectMode> = {
  fiction: {
    id: "fiction",
    label: "Ficção",
    blurb: "Romances, novelas e contos com actos, capítulos e cenas.",
    partLabel: "Acto",
    partLabelPlural: "Actos",
    chapterLabel: "Capítulo",
    chapterLabelPlural: "Capítulos",
    sceneLabel: "Cena",
    sceneLabelPlural: "Cenas",
    usesScenes: true,
    usesWorld: true,
    usesTimeline: true,
    usesRelations: true,
    editorClass: "prose",
    defaultKind: "romance",
    defaultTargetWords: 50_000,
    defaultChapterTitle: (n) => `Capítulo ${n}`,
    defaultPartTitle: (n) => `Acto ${n}`,
    defaultSceneTitle: (n) => `Cena ${n}`,
    genres: FICTION_GENRES,
    createHints: ["Romance", "Novela", "Conto", "Thriller", "Fantasia"],
    binderExtra: ["structure", "research", "bible", "timeline", "relations"],
  },
  fanfic: {
    id: "fanfic",
    label: "Fanfic",
    blurb: "Histórias a partir de universos existentes — mesma estrutura da ficção.",
    partLabel: "Acto",
    partLabelPlural: "Actos",
    chapterLabel: "Capítulo",
    chapterLabelPlural: "Capítulos",
    sceneLabel: "Cena",
    sceneLabelPlural: "Cenas",
    usesScenes: true,
    usesWorld: true,
    usesTimeline: true,
    usesRelations: true,
    editorClass: "prose",
    defaultKind: "novela",
    defaultTargetWords: 20_000,
    defaultChapterTitle: (n) => `Capítulo ${n}`,
    defaultPartTitle: (n) => `Parte ${n}`,
    defaultSceneTitle: (n) => `Cena ${n}`,
    genres: FICTION_GENRES,
    createHints: ["One-shot", "Multi-capítulo", "AU", "Canon"],
    binderExtra: ["structure", "research", "bible", "timeline", "relations"],
  },
  poetry: {
    id: "poetry",
    label: "Poesia",
    blurb: "Poemas e colecções — tipografia de verso, sem cenas de ficção.",
    partLabel: "Secção",
    partLabelPlural: "Secções",
    chapterLabel: "Poema",
    chapterLabelPlural: "Poemas",
    sceneLabel: "Estrofe",
    sceneLabelPlural: "Estrofes",
    usesScenes: true,
    usesWorld: false,
    usesTimeline: false,
    usesRelations: false,
    editorClass: "verse",
    defaultKind: "poesia",
    defaultTargetWords: 3_000,
    defaultChapterTitle: (n) => `Poema ${n}`,
    defaultPartTitle: (n) => `Secção ${n}`,
    defaultSceneTitle: (n) => `Estrofe ${n}`,
    genres: POETRY_GENRES,
    createHints: ["Livro de poemas", "Sonetos", "Slam", "Lírica"],
    binderExtra: ["research", "notes"],
  },
  prose: {
    id: "prose",
    label: "Prosa",
    blurb: "Crónicas, ensaios literários e prosa sem arco de ficção.",
    partLabel: "Parte",
    partLabelPlural: "Partes",
    chapterLabel: "Texto",
    chapterLabelPlural: "Textos",
    sceneLabel: "Secção",
    sceneLabelPlural: "Secções",
    usesScenes: true,
    usesWorld: false,
    usesTimeline: false,
    usesRelations: false,
    editorClass: "essay",
    defaultKind: "prosa",
    defaultTargetWords: 15_000,
    defaultChapterTitle: (n) => `Texto ${n}`,
    defaultPartTitle: (n) => `Parte ${n}`,
    defaultSceneTitle: (n) => `Secção ${n}`,
    genres: PROSE_GENRES,
    createHints: ["Crónica", "Ensaio", "Memórias", "Microconto"],
    binderExtra: ["research", "notes", "structure"],
  },
  nonfiction: {
    id: "nonfiction",
    label: "Não-ficção",
    blurb: "Livros gerais, ensaios e não-ficção com partes e capítulos.",
    partLabel: "Parte",
    partLabelPlural: "Partes",
    chapterLabel: "Capítulo",
    chapterLabelPlural: "Capítulos",
    sceneLabel: "Secção",
    sceneLabelPlural: "Secções",
    usesScenes: true,
    usesWorld: false,
    usesTimeline: true,
    usesRelations: false,
    editorClass: "essay",
    defaultKind: "livro",
    defaultTargetWords: 40_000,
    defaultChapterTitle: (n) => `Capítulo ${n}`,
    defaultPartTitle: (n) => `Parte ${n}`,
    defaultSceneTitle: (n) => `Secção ${n}`,
    genres: NONFICTION_GENRES,
    createHints: ["Biografia", "Ensaio", "Manual", "História"],
    binderExtra: ["structure", "research", "timeline", "notes"],
  },
  legal: {
    id: "legal",
    label: "Direito",
    blurb: "Doutrina, manuais e códigos — artigos, secções e tipografia jurídica.",
    partLabel: "Título",
    partLabelPlural: "Títulos",
    chapterLabel: "Artigo",
    chapterLabelPlural: "Artigos",
    sceneLabel: "Número / alínea",
    sceneLabelPlural: "Números",
    usesScenes: true,
    usesWorld: false,
    usesTimeline: false,
    usesRelations: false,
    editorClass: "legal",
    defaultKind: "direito",
    defaultTargetWords: 60_000,
    defaultChapterTitle: (n) => `Artigo ${n}`,
    defaultPartTitle: (n) => `Título ${n}`,
    defaultSceneTitle: (n) => `§ ${n}`,
    genres: LEGAL_GENRES,
    createHints: ["Doutrina", "Manual", "Código anotado", "Tese"],
    binderExtra: ["structure", "research", "notes"],
  },
};

export function modeOf(storyType?: StoryType | null): ProjectMode {
  return PROJECT_MODES[storyType ?? "fiction"] ?? PROJECT_MODES.fiction;
}

export const ALL_STORY_TYPES = Object.keys(PROJECT_MODES) as StoryType[];

export function genresFor(storyType?: StoryType | null): readonly string[] {
  return modeOf(storyType).genres;
}

export function binderTabsFor(storyType?: StoryType | null): { id: BinderId; label: string }[] {
  const mode = modeOf(storyType);
  const base: { id: BinderId; label: string }[] = [
    { id: "manuscript", label: "Manuscrito" },
  ];
  if (mode.binderExtra.includes("structure")) {
    base.push({ id: "structure", label: "Estrutura" });
  }
  if (mode.usesWorld || mode.binderExtra.includes("research")) {
    base.push({ id: "research", label: mode.usesWorld ? "Mundo" : "Notas / fichas" });
  }
  if (mode.usesWorld && mode.binderExtra.includes("bible")) {
    base.push({ id: "bible", label: "Bíblia" });
  }
  if (mode.usesTimeline) {
    base.push({ id: "timeline", label: "Cronologia" });
  }
  if (mode.usesRelations) {
    base.push({ id: "relations", label: "Relações" });
  }
  base.push({ id: "notes", label: "Bloco" });
  base.push({ id: "progress", label: "Progresso" });
  base.push({ id: "trash", label: "Lixo" });
  return base;
}
