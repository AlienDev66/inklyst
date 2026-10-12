export type TranslationStatus = "machine_draft" | "author_confirmed";

export type TranslationRecord = {
  locale: string;
  body: string;
  status: TranslationStatus;
};

/** Confirming a translation never replaces the chapter the author wrote. */
export function confirmTranslation(
  chapter: { body: string },
  translation: TranslationRecord,
): { chapterBody: string; translation: TranslationRecord } {
  return {
    chapterBody: chapter.body,
    translation: { ...translation, status: "author_confirmed" },
  };
}
