export {
  createPaginaClient,
  isSupabaseConfigured,
  type PaginaClient,
  type SupabaseEnv,
} from "./client";
export {
  fetchProfile,
  getSession,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updateOnboardingIntent,
  updatePreferredSpace,
  updateProfileName,
  type OnboardingIntent,
  type PreferredSpace,
} from "./auth";
export {
  createManuscript,
  deleteChapter,
  listManuscripts,
  reorderChapters,
  updateManuscriptTitle,
  upsertChapter,
  type ManuscriptWithChapters,
} from "./manuscripts";
export { loadManuscriptExtras, upsertManuscriptExtras } from "./extras";
export {
  findEditionByCode,
  getEditionById,
  listReadableEditions,
  publishEdition,
  unpublishEdition,
  type PublishedEdition,
} from "./catalog";
export {
  acceptPairByCode,
  activateSoloPair,
  createReadingPair,
  insertMarginNote,
  insertProgressMark,
  latestPage,
  listMarginNotes,
  listMyPairs,
  loadPairRoom,
  uploadPagePhoto,
  type PairRoom,
} from "./reading";
export { fetchCircleRanks, followUser, grantXp, insertProcessPost } from "./social";
export {
  confirmTranslationRpc,
  listChapterTranslations,
  upsertChapterTranslation,
} from "./translations";
export {
  addToBookList,
  createBookList,
  fetchPublicProfile,
  getReadingProgress,
  listBookLists,
  listReadingProgress,
  listReviewsByAuthor,
  listReviewsForEdition,
  updatePublicProfile,
  upsertReadingProgress,
  upsertReview,
  type BookListRow,
  type LibraryStatus,
  type ReadingProgressRow,
  type ReviewRow,
} from "./library";
export { insertWritingIdea, listWritingIdeas, type WritingIdeaRow } from "./ideas";
export {
  getEditionFile,
  insertParagraphComment,
  listParagraphComments,
  listParagraphReactions,
  upsertParagraphReaction,
  type ParagraphCommentRow,
  type ParagraphReactionRow,
} from "./paragraphSocial";
export type {
  ChapterRow,
  Database,
  EditionSnapshotRow,
  MarginNoteRow,
  ManuscriptRow,
  Profile,
  ProgressMarkRow,
  ReadingPairRow,
} from "./types";
export type { Session, User } from "@supabase/supabase-js";
