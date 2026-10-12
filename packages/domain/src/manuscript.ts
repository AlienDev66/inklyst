import { countWords, plainText } from "./text";
import { parseAdvisorNote, type AdvisorNote } from "./advisor";

export type OutlineRow = {
  id: string;
  kind: "part" | "chapter" | "scene";
  title: string;
  synopsis: string;
  words: number;
  status: string;
  parentId: string | null;
};

export type ManuscriptHit = {
  id: string;
  kind: "chapter" | "scene" | "note" | "world";
  title: string;
  snippet: string;
  parentTitle?: string;
};

export type WritingStats = {
  words: number;
  target: number;
  progress: number;
  chapters: number;
  scenes: number;
  emptyChapters: number;
  dailyPace: number;
  daysToFinish: number | null;
  weekWords: number;
};

type TextNode = {
  id: string;
  title: string;
  body: string;
  synopsis?: string;
  status?: string;
  scenes?: TextNode[];
};

type WorldNode = {
  id: string;
  title: string;
  body: string;
  kind: string;
};

type BookSlice = {
  title: string;
  pitch: string;
  targetWords: number;
  chapters: TextNode[];
  research?: WorldNode[];
  timeline?: { id: string; title: string; when: string; note: string }[];
};

export function wordsInNodes(nodes: TextNode[]): number {
  return nodes.reduce((sum, node) => {
    const own = countWords(node.body);
    const nested = node.scenes ? wordsInNodes(node.scenes) : 0;
    return sum + own + nested;
  }, 0);
}

export function outlineOf(book: BookSlice): OutlineRow[] {
  const rows: OutlineRow[] = [];
  for (const chapter of book.chapters) {
    rows.push({
      id: chapter.id,
      kind: "chapter",
      title: chapter.title || "Sem título",
      synopsis: chapter.synopsis ?? "",
      words: countWords(chapter.body) + wordsInNodes(chapter.scenes ?? []),
      status: chapter.status ?? "ideia",
      parentId: null,
    });
    for (const scene of chapter.scenes ?? []) {
      rows.push({
        id: scene.id,
        kind: "scene",
        title: scene.title || "Sem título",
        synopsis: scene.synopsis ?? "",
        words: countWords(scene.body),
        status: scene.status ?? "ideia",
        parentId: chapter.id,
      });
    }
  }
  return rows;
}

export function searchManuscript(book: BookSlice, query: string): ManuscriptHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hits: ManuscriptHit[] = [];

  function push(hit: ManuscriptHit) {
    hits.push(hit);
  }

  function snippet(text: string) {
    const lower = text.toLowerCase();
    const at = lower.indexOf(needle);
    if (at < 0) return text.slice(0, 120);
    const start = Math.max(0, at - 40);
    return `${start > 0 ? "…" : ""}${text.slice(start, start + 140)}${text.length > start + 140 ? "…" : ""}`;
  }

  for (const chapter of book.chapters) {
    const bag = `${chapter.title} ${chapter.synopsis ?? ""} ${plainText(chapter.body)}`;
    if (bag.toLowerCase().includes(needle)) {
      push({
        id: chapter.id,
        kind: "chapter",
        title: chapter.title || "Sem título",
        snippet: snippet(bag),
      });
    }
    for (const scene of chapter.scenes ?? []) {
      const sceneBag = `${scene.title} ${scene.synopsis ?? ""} ${plainText(scene.body)}`;
      if (sceneBag.toLowerCase().includes(needle)) {
        push({
          id: scene.id,
          kind: "scene",
          title: scene.title || "Sem título",
          parentTitle: chapter.title,
          snippet: snippet(sceneBag),
        });
      }
    }
  }

  for (const note of book.research ?? []) {
    const bag = `${note.title} ${note.body} ${note.kind}`;
    if (bag.toLowerCase().includes(needle)) {
      push({
        id: note.id,
        kind: "world",
        title: note.title || "Sem título",
        snippet: snippet(bag),
      });
    }
  }

  return hits.slice(0, 40);
}

export function writingStats(
  book: BookSlice,
  opts: { weekWords?: number; dailyPace?: number } = {},
): WritingStats {
  const words = wordsInNodes(book.chapters);
  const chapters = book.chapters.length;
  const scenes = book.chapters.reduce((sum, chapter) => sum + (chapter.scenes?.length ?? 0), 0);
  const emptyChapters = book.chapters.filter(
    (chapter) => countWords(chapter.body) + wordsInNodes(chapter.scenes ?? []) === 0,
  ).length;
  const target = Math.max(book.targetWords, 1);
  const progress = Math.min(100, Math.round((words / target) * 100));
  const dailyPace = Math.max(0, opts.dailyPace ?? 0);
  const remaining = Math.max(0, target - words);
  const daysToFinish = dailyPace > 0 ? Math.ceil(remaining / dailyPace) : null;
  return {
    words,
    target,
    progress,
    chapters,
    scenes,
    emptyChapters,
    dailyPace,
    daysToFinish,
    weekWords: opts.weekWords ?? 0,
  };
}

/** Builds a local advisor question from book structure. Never returns prose to insert. */
export function advisorFromBook(book: BookSlice, focusTitle?: string): AdvisorNote {
  const people = (book.research ?? []).filter((item) => item.kind === "pessoa");
  const places = (book.research ?? []).filter((item) => item.kind === "lugar");
  const empty = book.chapters.find(
    (chapter) => countWords(chapter.body) + wordsInNodes(chapter.scenes ?? []) === 0,
  );
  const thin = book.chapters.find((chapter) => {
    const words = countWords(chapter.body) + wordsInNodes(chapter.scenes ?? []);
    return words > 0 && words < 40;
  });

  let kind: AdvisorNote["kind"] = "question";
  let prompt = "O que é que este livro ainda não te deixou escrever?";

  if (focusTitle) {
    kind = "return";
    prompt = `Voltaste a «${focusTitle}». O que é que esta página ainda não mostrou?`;
  } else if (empty) {
    kind = "gap";
    prompt = `«${empty.title || "Sem título"}» está vazio. O que é que tem de acontecer antes de o poderes escrever?`;
  } else if (thin) {
    kind = "gap";
    prompt = `«${thin.title || "Sem título"}» ainda é curto. Que facto do mundo falta entrar nesta cena?`;
  } else if (people.length && places.length) {
    kind = "continuity";
    prompt = `${people[0].title} e ${places[0].title} já existem no mundo. Quem muda o outro neste capítulo?`;
  } else if (book.timeline && book.timeline.length > 1) {
    kind = "continuity";
    prompt = `Na cronologia, «${book.timeline[0].title}» vem antes de «${book.timeline[1].title}». O manuscrito respeita essa ordem?`;
  } else if (book.pitch) {
    kind = "question";
    prompt = `A frase de orientação é: «${book.pitch.slice(0, 120)}». Onde é que o capítulo actual se afasta dela?`;
  }

  return parseAdvisorNote({ kind, prompt: prompt.slice(0, 400) });
}

export function manuscriptHtml(book: {
  title: string;
  penName?: string;
  chapters: { title: string; body: string; scenes?: { title: string; body: string }[] }[];
}): string {
  const blocks = book.chapters
    .map((chapter) => {
      const scenes = (chapter.scenes ?? [])
        .map((scene) => `<h3>${escapeHtml(scene.title || "Sem título")}</h3><p>${toParagraphs(scene.body)}</p>`)
        .join("");
      return `<section><h2>${escapeHtml(chapter.title || "Sem título")}</h2><p>${toParagraphs(chapter.body)}</p>${scenes}</section>`;
    })
    .join("\n");
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"/><title>${escapeHtml(book.title)}</title>
<style>body{font-family:Georgia,serif;max-width:42rem;margin:2rem auto;line-height:1.7;color:#1a1714}h1,h2,h3{font-weight:600}h1{font-size:2rem}h2{margin-top:2.5rem}p{margin:0 0 1rem;white-space:pre-wrap}</style>
</head><body><h1>${escapeHtml(book.title)}</h1>${book.penName ? `<p><em>${escapeHtml(book.penName)}</em></p>` : ""}${blocks}</body></html>`;
}

export function manuscriptMarkdown(book: {
  title: string;
  penName?: string;
  chapters: { title: string; body: string; scenes?: { title: string; body: string }[] }[];
}): string {
  const parts = [`# ${book.title}`, book.penName ? `*${book.penName}*` : "", ""];
  for (const chapter of book.chapters) {
    parts.push(`## ${chapter.title || "Sem título"}`, "", plainText(chapter.body), "");
    for (const scene of chapter.scenes ?? []) {
      parts.push(`### ${scene.title || "Sem título"}`, "", plainText(scene.body), "");
    }
  }
  return parts.join("\n");
}

function toParagraphs(body: string) {
  if (!body.trim()) return "&nbsp;";
  if (/<\/?(?:b|i|u|em|strong|a|ul|ol|li)\b/i.test(body)) return body;
  return escapeHtml(body).replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
