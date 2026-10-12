import {
  advisorReply,
  parseAdvisorNote,
  rewriteSelection,
  styleFingerprint,
  type AdvisorNote,
} from "@pagina/domain";
import { chapterCloudBody, type Book } from "./books";
import { supabase } from "../../lib/supabase";

export type AdvisorSource = "live" | "local" | "unavailable";

export type AdvisorResult = AdvisorNote & { source: AdvisorSource };

export type RewriteResult = {
  suggestion: string;
  source: AdvisorSource;
};

export type TranslationResult = {
  id: string;
  locale: string;
  body: string;
  status: "machine_draft" | "author_confirmed";
  source: AdvisorSource;
};

function advisorBase(): string | undefined {
  return (import.meta.env.VITE_ADVISOR_URL as string | undefined)?.replace(/\/$/, "");
}

function sliceBook(book: Book) {
  return {
    title: book.title,
    pitch: book.pitch,
    targetWords: book.targetWords,
    bible: book.bible,
    chapters: book.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      body: chapterCloudBody(chapter),
      synopsis: chapter.synopsis,
      objective: chapter.objective,
      conflict: chapter.conflict,
      reveal: chapter.reveal,
      scenes: chapter.scenes.map((scene) => ({
        title: scene.title,
        body: scene.body,
      })),
    })),
    research: book.research.map((note) => ({
      id: note.id,
      title: note.title,
      body: note.body,
      kind: note.kind,
      age: note.age,
      role: note.role,
      goal: note.goal,
      fear: note.fear,
      secret: note.secret,
      from: note.from,
      to: note.to,
      links: note.links,
    })),
    timeline: book.timeline.map((event) => ({
      id: event.id,
      title: event.title,
      when: event.when,
      note: event.note,
      chapterIds: event.chapterIds,
      linkedIds: event.linkedIds,
    })),
    truths: book.bible?.truths ?? [],
    memory: (book.memory ?? [])
      .filter((item) => item.status === "accepted")
      .map((item) => item.text),
    style: styleFingerprint(book.chapters),
  };
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Calls advisor service when configured; falls back to local contextual reply. */
export async function askAdvisor(
  book: Book,
  question: string,
  focusTitle?: string,
  chapterId?: string,
): Promise<AdvisorResult> {
  const base = advisorBase();
  if (base) {
    try {
      const response = await fetch(`${base}/advisor`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          book: sliceBook(book),
          question,
          focusTitle,
          chapterId: chapterId ?? book.activeChapterId,
        }),
      });
      if (response.ok) {
        const json = (await response.json()) as unknown;
        return { ...parseAdvisorNote(json), source: "live" };
      }
      return {
        ...advisorReply(sliceBook(book), question, focusTitle),
        source: "unavailable",
      };
    } catch {
      return {
        ...advisorReply(sliceBook(book), question, focusTitle),
        source: "unavailable",
      };
    }
  }
  return { ...advisorReply(sliceBook(book), question, focusTitle), source: "local" };
}

/** Returns rewriteable prose for a selection. Never returns advice-only. */
export async function askRewrite(
  book: Book,
  selection: string,
  instruction = "Torna isto mais tenso sem mudar o meu estilo.",
): Promise<RewriteResult> {
  const trimmed = selection.trim();
  if (!trimmed) return { suggestion: "", source: "local" };

  const base = advisorBase();
  const style = styleFingerprint(book.chapters);
  const tone = book.bible?.tone || "";
  const local = () => rewriteSelection(trimmed, "tenser", `${style} ${tone}`);

  if (base) {
    try {
      const response = await fetch(`${base}/rewrite`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          book: sliceBook(book),
          selection: trimmed,
          instruction,
          style,
          tone,
          chapterId: book.activeChapterId,
        }),
      });
      if (response.ok) {
        const json = (await response.json()) as { suggestion?: string };
        if (json.suggestion?.trim() && json.suggestion.trim() !== trimmed) {
          return { suggestion: json.suggestion.trim(), source: "live" };
        }
      }
      return { suggestion: local(), source: "unavailable" };
    } catch {
      return { suggestion: local(), source: "unavailable" };
    }
  }

  return { suggestion: local(), source: "local" };
}

export async function requestChapterTranslation(
  book: Book,
  chapterId: string,
  locale = "en",
): Promise<TranslationResult | null> {
  const chapter = book.chapters.find((item) => item.id === chapterId);
  if (!chapter) return null;
  const sourceBody = chapterCloudBody(chapter);
  const base = advisorBase();
  if (!base) {
    return {
      id: crypto.randomUUID(),
      locale,
      body: `[rascunho ${locale}]\n\n${sourceBody}`,
      status: "machine_draft",
      source: "local",
    };
  }
  try {
    const response = await fetch(`${base}/translate`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        chapterId,
        locale,
        sourceBody,
        title: chapter.title,
      }),
    });
    if (!response.ok) return null;
    const row = (await response.json()) as {
      id: string;
      locale: string;
      body: string;
      status: "machine_draft" | "author_confirmed";
    };
    return {
      id: row.id,
      locale: row.locale,
      body: row.body,
      status: row.status,
      source: "live",
    };
  } catch {
    return null;
  }
}

export function advisorSourceLabel(source: AdvisorSource): string {
  if (source === "live") return "Serviço";
  if (source === "unavailable") return "Serviço indisponível · heurística";
  return "Heurística local";
}
