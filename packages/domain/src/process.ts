export type ProcessKind = "reading_check_in" | "writing_session";

export type PublicProcess = {
  kind: ProcessKind;
  title: string;
  page?: number;
  wordCount?: number;
};

export function toPublicProcess(input: {
  kind: ProcessKind;
  title: string;
  page?: number;
  wordCount?: number;
  noteBody?: string;
  chapterBody?: string;
}): PublicProcess {
  const title = input.title.trim();
  if (!title) throw new Error("process title refused");

  if (input.kind === "reading_check_in") {
    if (input.page === undefined || input.page < 0) {
      throw new Error("process page refused");
    }
    return { kind: input.kind, title, page: input.page };
  }

  if (input.wordCount === undefined || input.wordCount < 0) {
    throw new Error("process words refused");
  }
  return { kind: input.kind, title, wordCount: input.wordCount };
}
