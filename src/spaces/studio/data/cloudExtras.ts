import { loadManuscriptExtras, upsertManuscriptExtras } from "@pagina/supabase";
import type { Book } from "../books";
import { supabase } from "../../../lib/supabase";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export function extrasPayload(book: Book): Json {
  return {
    penName: book.penName,
    pitch: book.pitch,
    kind: book.kind,
    cover: book.cover,
    storyType: book.storyType ?? "fiction",
    tags: book.tags ?? [],
    genres: book.genres ?? [],
    language: book.language ?? "pt",
    copyright: book.copyright ?? "all-rights",
    mature: book.mature ?? false,
    targetWords: book.targetWords,
    sessionTarget: book.sessionTarget,
    dailyTarget: book.dailyTarget,
    weeklyTarget: book.weeklyTarget,
    status: book.status,
    folder: book.folder ?? null,
    parts: book.parts,
    trash: book.trash,
    research: book.research,
    timeline: book.timeline,
    wordLog: book.wordLog,
    translations: book.translations,
    published: book.published,
    bible: book.bible,
    memory: book.memory,
    sessionLog: book.sessionLog,
    writeStreak: book.writeStreak,
    comments: book.comments,
    revision: book.revision,
    chaptersMeta: book.chapters.map((chapter) => ({
      id: chapter.id,
      synopsis: chapter.synopsis,
      notes: chapter.notes,
      status: chapter.status,
      label: chapter.label,
      partId: chapter.partId,
      scenes: chapter.scenes,
      activeSceneId: chapter.activeSceneId,
      snapshots: chapter.snapshots,
      advisor: chapter.advisor ?? null,
      objective: chapter.objective ?? "",
      conflict: chapter.conflict ?? "",
      reveal: chapter.reveal ?? "",
      tension: chapter.tension ?? null,
    })),
  };
}

export function applyExtras(book: Book, payload: Json | undefined): Book {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return book;
  const data = payload as Record<string, unknown>;
  const chaptersMeta = Array.isArray(data.chaptersMeta)
    ? (data.chaptersMeta as Array<Record<string, unknown>>)
    : [];
  const metaById = new Map(chaptersMeta.map((item) => [String(item.id), item]));

  return {
    ...book,
    penName: typeof data.penName === "string" ? data.penName : book.penName,
    pitch: typeof data.pitch === "string" ? data.pitch : book.pitch,
    kind: (data.kind as Book["kind"]) || book.kind,
    cover: (data.cover as Book["cover"]) || book.cover,
    storyType: (data.storyType as Book["storyType"]) || book.storyType,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : book.tags,
    genres: Array.isArray(data.genres) ? (data.genres as string[]) : book.genres,
    language: typeof data.language === "string" ? data.language : book.language,
    copyright: typeof data.copyright === "string" ? data.copyright : book.copyright,
    mature: typeof data.mature === "boolean" ? data.mature : book.mature,
    targetWords: typeof data.targetWords === "number" ? data.targetWords : book.targetWords,
    sessionTarget: typeof data.sessionTarget === "number" ? data.sessionTarget : book.sessionTarget,
    dailyTarget: typeof data.dailyTarget === "number" ? data.dailyTarget : book.dailyTarget,
    weeklyTarget: typeof data.weeklyTarget === "number" ? data.weeklyTarget : book.weeklyTarget,
    status: (data.status as Book["status"]) || book.status,
    folder: typeof data.folder === "string" ? data.folder : book.folder,
    parts: Array.isArray(data.parts) ? (data.parts as Book["parts"]) : book.parts,
    trash: Array.isArray(data.trash) ? (data.trash as Book["trash"]) : book.trash,
    research: Array.isArray(data.research) ? (data.research as Book["research"]) : book.research,
    timeline: Array.isArray(data.timeline) ? (data.timeline as Book["timeline"]) : book.timeline,
    wordLog: Array.isArray(data.wordLog) ? (data.wordLog as Book["wordLog"]) : book.wordLog,
    translations:
      data.translations && typeof data.translations === "object"
        ? (data.translations as Book["translations"])
        : book.translations,
    published: (data.published as Book["published"]) ?? book.published,
    bible: data.bible && typeof data.bible === "object"
      ? (data.bible as Book["bible"])
      : book.bible,
    memory: Array.isArray(data.memory) ? (data.memory as Book["memory"]) : book.memory,
    sessionLog: Array.isArray(data.sessionLog)
      ? (data.sessionLog as Book["sessionLog"])
      : book.sessionLog,
    writeStreak: typeof data.writeStreak === "number" ? data.writeStreak : book.writeStreak,
    comments: Array.isArray(data.comments) ? (data.comments as Book["comments"]) : book.comments,
    revision: typeof data.revision === "number" ? data.revision : book.revision,
    chapters: book.chapters.map((chapter) => {
      const meta = metaById.get(chapter.id);
      if (!meta) return chapter;
      return {
        ...chapter,
        synopsis: typeof meta.synopsis === "string" ? meta.synopsis : chapter.synopsis,
        notes: typeof meta.notes === "string" ? meta.notes : chapter.notes,
        status: (meta.status as Book["chapters"][number]["status"]) || chapter.status,
        label: (meta.label as Book["chapters"][number]["label"]) || chapter.label,
        partId: (meta.partId as string | null) ?? chapter.partId,
        scenes: Array.isArray(meta.scenes) ? (meta.scenes as typeof chapter.scenes) : chapter.scenes,
        activeSceneId: (meta.activeSceneId as string | null) ?? chapter.activeSceneId,
        snapshots: Array.isArray(meta.snapshots)
          ? (meta.snapshots as typeof chapter.snapshots)
          : chapter.snapshots,
        advisor: (meta.advisor as typeof chapter.advisor) ?? chapter.advisor,
        objective: typeof meta.objective === "string" ? meta.objective : chapter.objective,
        conflict: typeof meta.conflict === "string" ? meta.conflict : chapter.conflict,
        reveal: typeof meta.reveal === "string" ? meta.reveal : chapter.reveal,
        tension: typeof meta.tension === "number" ? meta.tension : chapter.tension,
      };
    }),
  };
}

export async function syncBookExtras(book: Book) {
  return upsertManuscriptExtras(supabase, book.id, extrasPayload(book));
}

export async function loadExtrasMap(ids: string[]) {
  return loadManuscriptExtras(supabase, ids);
}
