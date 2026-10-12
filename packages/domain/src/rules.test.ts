import { describe, expect, test } from "bun:test";
import { parseAdvisorNote } from "./advisor";
import { advisorReply } from "./advisorReply";
import { canRenderEdition } from "./edition";
import { advisorFromBook, searchManuscript, writingStats } from "./manuscript";
import { toPublicProcess } from "./process";
import {
  emptyShelf,
  findEditionByCode,
  makeBetaCode,
  paginateManuscript,
  upsertEdition,
} from "./shelf";
import { canReadMargin } from "./spoiler";
import { confirmTranslation } from "./translation";
import { rankCircle, xpAmount } from "./xp";

describe("margin lock", () => {
  test("the author always sees their own note", () => {
    expect(
      canReadMargin({ readerPage: 1, anchorPage: 40, isAuthor: true }),
    ).toBe(true);
  });

  test("a partner behind the anchor does not see the note", () => {
    expect(
      canReadMargin({ readerPage: 3, anchorPage: 7, isAuthor: false }),
    ).toBe(false);
  });

  test("a partner on the anchor page sees the note", () => {
    expect(
      canReadMargin({ readerPage: 7, anchorPage: 7, isAuthor: false }),
    ).toBe(true);
  });
});

describe("xp", () => {
  test("amounts are fixed and showing up is worth more than sharing", () => {
    expect(xpAmount("showed_up")).toBe(10);
    expect(xpAmount("finished_together")).toBe(40);
    expect(xpAmount("shared_process")).toBe(5);
  });

  test("speed and yearly goals are refused", () => {
    expect(() => xpAmount("pages_speed")).toThrow("xp kind refused");
    expect(() => xpAmount("yearly_goal")).toThrow("xp kind refused");
  });

  test("rank is only a sort of the circle you pass in", () => {
    expect(
      rankCircle([
        { userId: "rui", xp: 10 },
        { userId: "marina", xp: 55 },
        { userId: "tu", xp: 40 },
      ]).map((entry) => entry.userId),
    ).toEqual(["marina", "tu", "rui"]);
  });
});

describe("advisor", () => {
  test("a question is kept", () => {
    expect(
      parseAdvisorNote({
        kind: "return",
        prompt: "Paraste na frase da chávena. O que é que ela ainda não disse?",
      }),
    ).toEqual({
      kind: "return",
      prompt: "Paraste na frase da chávena. O que é que ela ainda não disse?",
    });
  });

  test("prose written for the author is refused", () => {
    expect(() =>
      parseAdvisorNote({
        kind: "question",
        prompt: "Continua.",
        rewrite: "Ela abriu a janela e o capítulo ficou resolvido.",
      }),
    ).toThrow("advisor prose refused");
  });
});

describe("process sharing", () => {
  test("a public writing post keeps the count and drops the chapter", () => {
    const post = toPublicProcess({
      kind: "writing_session",
      title: "A cozinha",
      wordCount: 128,
      chapterBody: "O texto inteiro que não pode sair.",
    });
    expect(post).toEqual({
      kind: "writing_session",
      title: "A cozinha",
      wordCount: 128,
    });
    expect(post).not.toHaveProperty("chapterBody");
  });

  test("a public reading post keeps the page and drops the margin", () => {
    const post = toPublicProcess({
      kind: "reading_check_in",
      title: "A mesa da cozinha",
      page: 4,
      noteBody: "O spoiler que a outra pessoa ainda não leu.",
    });
    expect(post).toEqual({
      kind: "reading_check_in",
      title: "A mesa da cozinha",
      page: 4,
    });
    expect(post).not.toHaveProperty("noteBody");
  });
});

describe("translation", () => {
  test("confirming a draft leaves the original chapter untouched", () => {
    const result = confirmTranslation(
      { body: "A chávena ainda está quente." },
      {
        locale: "en",
        body: "The cup is still warm.",
        status: "machine_draft",
      },
    );
    expect(result.chapterBody).toBe("A chávena ainda está quente.");
    expect(result.translation.status).toBe("author_confirmed");
    expect(result.translation.body).toBe("The cup is still warm.");
  });
});

describe("edition", () => {
  test("a catalog record without a license cannot open the ebook reader", () => {
    expect(canRenderEdition({ licensee: null })).toBe(false);
    expect(canRenderEdition({ licensee: "pagina-original" })).toBe(true);
  });
});

describe("manuscript", () => {
  const book = {
    title: "Casa vazia",
    pitch: "Uma cadeira continua posta.",
    targetWords: 1000,
    chapters: [
      {
        id: "c1",
        title: "A cozinha",
        body: "A chávena ainda está quente.",
        synopsis: "Ela chega.",
        status: "rascunho",
        scenes: [{ id: "s1", title: "A porta", body: "Bateu." }],
      },
      { id: "c2", title: "A janela", body: "", synopsis: "", status: "ideia", scenes: [] },
    ],
    research: [{ id: "p1", kind: "pessoa", title: "Ela", body: "Sem nome." }],
  };

  test("stats count scenes and empty chapters", () => {
    const stats = writingStats(book, { dailyPace: 10, weekWords: 20 });
    expect(stats.chapters).toBe(2);
    expect(stats.scenes).toBe(1);
    expect(stats.emptyChapters).toBe(1);
    expect(stats.words).toBeGreaterThan(0);
    expect(stats.daysToFinish).toBeGreaterThan(0);
  });

  test("search finds a scene without returning the whole book", () => {
    const hits = searchManuscript(book, "porta");
    expect(hits[0]?.kind).toBe("scene");
    expect(hits[0]?.title).toBe("A porta");
  });

  test("advisor from book returns a question, never prose keys", () => {
    const note = advisorFromBook(book);
    expect(["question", "gap", "continuity", "return"]).toContain(note.kind);
    expect(note.prompt.length).toBeGreaterThan(0);
    expect(() => parseAdvisorNote({ kind: "question", prompt: note.prompt, rewrite: "no" })).toThrow();
  });
});

describe("advisor reply and shelf", () => {
  const book = {
    title: "Casa vazia",
    pitch: "Uma cadeira continua posta.",
    targetWords: 1000,
    chapters: [
      {
        id: "c1",
        title: "A cozinha",
        body: "A chávena ainda está quente.\n\nEla não bebeu.\n\nA cadeira ficou.",
        scenes: [{ title: "A porta", body: "Bateu uma vez e depois outra." }],
      },
      { id: "c2", title: "A janela", body: "A luz mudou.", scenes: [] },
    ],
    research: [{ id: "p1", kind: "pessoa", title: "Ela", body: "Sem nome." }],
  };

  test("advisor reply stays within prompt contract", () => {
    const note = advisorReply(book, "preciso de personagens");
    expect(note.prompt.length).toBeGreaterThan(0);
    expect(note.prompt.length).toBeLessThanOrEqual(400);
  });

  test("paginate manuscript yields pages", () => {
    const pages = paginateManuscript(book.chapters, 80);
    expect(pages.length).toBeGreaterThan(1);
  });

  test("beta code unlocks edition on shelf", () => {
    const edition = {
      id: "e1",
      bookId: "b1",
      title: "Casa",
      penName: "",
      pitch: "",
      coverHue: 1,
      publishedAt: 1,
      visibility: "beta" as const,
      betaCode: makeBetaCode("casa"),
      chapters: [],
      pages: ["uma"],
    };
    const shelf = upsertEdition(emptyShelf(), edition);
    expect(findEditionByCode(shelf, edition.betaCode)?.id).toBe("e1");
  });
});
