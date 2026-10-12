import { parseAdvisorNote, type AdvisorNote } from "./advisor";
import { advisorFromBook } from "./manuscript";
import { askTheBook, scanContinuity } from "./storyIntel";
import { countWords } from "./text";

type BookSlice = {
  title: string;
  pitch: string;
  targetWords: number;
  chapters: {
    id: string;
    title: string;
    body: string;
    synopsis?: string;
    scenes?: { id?: string; title: string; body: string }[];
  }[];
  research?: {
    id: string;
    title: string;
    body: string;
    kind: string;
    age?: string;
    goal?: string;
    fear?: string;
    secret?: string;
  }[];
  timeline?: { id: string; title: string; when: string; note: string; linkedIds?: string[] }[];
  bible?: {
    era?: string;
    places?: string[];
    themes?: string[];
    narrator?: string;
    tone?: string;
    rules?: string[];
    truths?: string[];
  };
  truths?: string[];
  memory?: string[];
};

function asAdvisorBook(book: BookSlice) {
  return {
    ...book,
    chapters: book.chapters.map((chapter) => ({
      ...chapter,
      scenes: (chapter.scenes ?? []).map((scene, index) => ({
        id: scene.id ?? `${chapter.id}-scene-${index}`,
        title: scene.title,
        body: scene.body,
      })),
    })),
  };
}

/**
 * Contextual advisor reply for the whole book.
 * Never returns prose meant to be pasted into the chapter.
 */
export function advisorReply(
  book: BookSlice,
  question: string,
  focusTitle?: string,
): AdvisorNote {
  const base = advisorFromBook(asAdvisorBook(book), focusTitle);
  const q = question.trim().toLowerCase();
  const people = (book.research ?? []).filter((item) => item.kind === "pessoa");
  const places = (book.research ?? []).filter((item) => item.kind === "lugar");
  const orgs = (book.research ?? []).filter((item) => item.kind === "organizacao");
  const events = (book.research ?? []).filter((item) => item.kind === "evento");
  const words = book.chapters.reduce((sum, chapter) => {
    const own = countWords(chapter.body);
    const nested = (chapter.scenes ?? []).reduce((n, scene) => n + countWords(scene.body), 0);
    return sum + own + nested;
  }, 0);
  const empty = book.chapters.filter(
    (chapter) =>
      countWords(chapter.body) +
        (chapter.scenes ?? []).reduce((n, scene) => n + countWords(scene.body), 0) ===
      0,
  );

  let kind: AdvisorNote["kind"] = base.kind;
  let prompt = base.prompt;

  if (!q) {
    return base;
  }

  if (/inconsist|continuidade|contradi/.test(q)) {
    const flags = scanContinuity({
      chapters: book.chapters,
      people: book.research ?? [],
      bible: book.bible,
      timeline: (book.timeline ?? []).map((item) => ({
        ...item,
        linkedIds: item.linkedIds ?? [],
      })),
    }).filter((item) => item.severity === "warn");
    kind = "continuity";
    prompt = flags.length
      ? flags.map((flag) => `${flag.title}: ${flag.detail}`).join(" ")
      : "Não encontrei inconsistências óbvias. Queres que eu verifique um detalhe concreto (idade, cicatriz, lugar)?";
    return parseAdvisorNote({ kind, prompt: prompt.slice(0, 400) });
  }

  if (/bíblia|biblia|regra|época|epoca|narrador|tom do livro/.test(q) && book.bible) {
    kind = "continuity";
    const rule = book.bible.rules?.[0];
    prompt = [
      book.bible.era && `Época: ${book.bible.era}.`,
      book.bible.tone && `Tom: ${book.bible.tone}.`,
      rule && `Regra: ${rule}`,
      "Se o teu rascunho contrariar isto, avisa — não inventes uma versão nova.",
    ]
      .filter(Boolean)
      .join(" ");
    return parseAdvisorNote({ kind, prompt: prompt.slice(0, 400) });
  }

  if (/quando|idade|aparec|quem sabe|última|ultima/.test(q)) {
    kind = "continuity";
    prompt = askTheBook(question, {
      chapters: book.chapters,
      people: book.research ?? [],
      timeline: (book.timeline ?? []).map((item) => ({
        ...item,
        linkedIds: item.linkedIds ?? [],
      })),
      bible: book.bible,
    });
    return parseAdvisorNote({ kind, prompt: prompt.slice(0, 400) });
  }

  if (/mais tenso|reescrev|sugestão|sugestao|sem mudar o (meu )?estilo/.test(q)) {
    kind = "question";
    const excerpt = question.split("\n").slice(-3).join(" ").trim();
    prompt = excerpt.length > 20
      ? `Mantém a tua voz. Experimenta: aperta o verbo, corta o adjetivo fácil, e deixa o corpo da personagem carregar a tensão — sem acrescentar explicação. (Não colei prosa pronta: reescreve tu a partir desta direcção.)`
      : "Selecciona a frase no editor e pede para a tornar mais tensa — mostro original vs sugestão.";
    return parseAdvisorNote({ kind, prompt: prompt.slice(0, 400) });
  }

  if (/personag|quem|perfil|nome/.test(q)) {
    kind = "question";
    prompt = people.length
      ? `No mundo já tens ${people.map((item) => item.title).slice(0, 3).join(", ")}. Que facto concreto falta a um deles para esta cena não poder ser trocada?`
      : "Ainda não há personagens no Mundo. Quem tem de existir antes de esta cena poder avançar?";
  } else if (/cena|desenvolv|expand|mostrar/.test(q)) {
    kind = "gap";
    prompt = focusTitle
      ? `Em «${focusTitle}», o que é que o leitor ainda não viu com os sentidos — cheiro, som, peso — e que muda a decisão da personagem?`
      : "Que batida desta cena é só resumo? Onde é que o corpo da personagem podia fazer o trabalho da frase?";
  } else if (/bloque|preso|não sei|nao sei|parar|continua/.test(q)) {
    kind = "return";
    prompt = empty[0]
      ? `O bloqueio pode ser «${empty[0].title}» ainda vazio. Que pergunta simples responderias numa linha sobre esse capítulo?`
      : `Tens ${words.toLocaleString("pt-PT")} palavras. Qual é a última frase que escreveste com certeza — e o que ela obriga a acontecer a seguir?`;
  } else if (/gramá|grama|estilo|frase|rever|corrig/.test(q)) {
    kind = "question";
    prompt =
      "Em vez de corrigir tudo: qual é a frase que não soa à voz de quem a diz? Lê-a em voz alta e marca só essa.";
  } else if (/tempo|cronolog|ordem|quando/.test(q)) {
    kind = "continuity";
    const timeline = book.timeline ?? [];
    prompt = timeline.length
      ? `Na cronologia há ${timeline.length} marcos. O manuscrito respeita a ordem de «${timeline[0].title}» para o resto?`
      : "Ainda não há cronologia. Que acontecimento do mundo tem de existir antes deste capítulo?";
  } else if (/lugar|sítio|sitio|mundo|organiza/.test(q)) {
    kind = "continuity";
    const names = [...places, ...orgs, ...events].map((item) => item.title).slice(0, 3);
    prompt = names.length
      ? `${names.join(", ")} já estão no Mundo. Qual destes empurra a personagem a agir agora?`
      : "O Mundo ainda está fino. Que lugar ou organização torna esta cena inevitável?";
  } else if (/feedback|melhor|fraco|forte|opini/.test(q)) {
    kind = "gap";
    prompt = book.pitch
      ? `A orientação é «${book.pitch.slice(0, 100)}». Em que capítulo o texto mais se afasta disso — e o que cortarias primeiro?`
      : base.prompt;
  } else {
    kind = base.kind;
    prompt = `${base.prompt} (Sobre a tua pergunta: responde só com o que o livro ainda não mostrou — não com prosa para colar.)`;
  }

  return parseAdvisorNote({ kind, prompt: prompt.slice(0, 400) });
}
