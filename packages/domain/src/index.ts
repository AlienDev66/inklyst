export {
  ADVISOR_KINDS,
  type AdvisorKind,
  type AdvisorNote,
  parseAdvisorNote,
} from "./advisor";
export { countWords, plainText } from "./text";
export {
  ageContinuity,
  agesOnTimeline,
  askTheBook,
  chapterTension,
  collapseMemoryPrefixDupes,
  extractMemoryFacts,
  knowledgeMap,
  rewriteSelection,
  scanContinuity,
  styleFingerprint,
  type ContinuityFlag,
  type KnowledgeEdge,
  type MemoryFact,
  type TimelineAgeRow,
} from "./storyIntel";
export {
  type ProcessKind,
  type PublicProcess,
  toPublicProcess,
} from "./process";
export { canReadMargin } from "./spoiler";
export {
  type TranslationRecord,
  type TranslationStatus,
  confirmTranslation,
} from "./translation";
export { canRenderEdition } from "./edition";
export { XP_AMOUNTS, type XpKind, rankCircle, xpAmount } from "./xp";
export {
  advisorFromBook,
  manuscriptHtml,
  manuscriptMarkdown,
  outlineOf,
  searchManuscript,
  wordsInNodes,
  writingStats,
  type ManuscriptHit,
  type OutlineRow,
  type WritingStats,
} from "./manuscript";
export { advisorReply } from "./advisorReply";
export {
  SHELF_KEY,
  compileChapters,
  emptyShelf,
  findEditionByCode,
  makeBetaCode,
  paginateManuscript,
  parseEditionChapters,
  parseShelf,
  readingModeOf,
  removeEdition,
  serializeShelf,
  upsertEdition,
  visibleEditions,
  type ReadingMode,
  type ShelfChapter,
  type ShelfEdition,
  type ShelfInvite,
  type ShelfNote,
  type ShelfState,
} from "./shelf";
