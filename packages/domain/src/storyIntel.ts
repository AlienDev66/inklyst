import { plainText } from "./text";

export type ContinuityFlag = {
  id: string;
  severity: "warn" | "info";
  title: string;
  detail: string;
  chapterIds: string[];
};

export type MemoryFact = {
  id: string;
  text: string;
  chapterId: string;
  chapterTitle: string;
};

export type KnowledgeEdge = {
  knower: string;
  secret: string;
  subject: string;
  chapterId?: string;
};

type ChapterLike = {
  id: string;
  title: string;
  body: string;
  scenes?: { title?: string; body: string }[];
};
type PersonLike = {
  id: string;
  title: string;
  kind: string;
  body: string;
  age?: string;
  goal?: string;
  fear?: string;
  secret?: string;
  links?: { toId: string; label: string; tone?: string }[];
};
type BibleLike = {
  era?: string;
  places?: string[];
  themes?: string[];
  narrator?: string;
  tone?: string;
  rules?: string[];
  truths?: string[];
};
type TimelineLike = {
  id: string;
  title: string;
  when: string;
  note: string;
  linkedIds: string[];
  chapterIds?: string[];
};

function yearOf(when: string): number | null {
  const match = when.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function ageYears(age: string | undefined): number | null {
  if (!age) return null;
  const match = age.match(/\d{1,3}/);
  return match ? Number(match[0]) : null;
}

/** Who knows which secrets, from fichas + manuscript cues. */
export function knowledgeMap(input: {
  chapters: ChapterLike[];
  people: PersonLike[];
}): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  for (const person of input.people.filter((item) => item.kind === "pessoa")) {
    const secret = (person.secret || "").trim();
    if (!secret || /ainda não|não definido|ndefinid/i.test(secret)) continue;
    edges.push({
      knower: person.title,
      secret,
      subject: person.title,
    });

    for (const chapter of input.chapters) {
      const plain = plainText(chapter.body).toLowerCase();
      const name = person.title.toLowerCase();
      if (!name || !plain.includes(name)) continue;
      if (/(soube|descobriu|confess|revelou|contou(-lhe)? o segredo)/.test(plain)) {
        edges.push({
          knower: person.title,
          secret: `Parece saber / revelar algo em «${chapter.title || "capítulo"}»`,
          subject: person.title,
          chapterId: chapter.id,
        });
      }
    }
  }
  return edges.slice(0, 40);
}

export type TimelineAgeRow = {
  eventId: string;
  personId: string;
  personTitle: string;
  stated: number | null;
  expected: number | null;
  birthWhen: string | null;
  drift: number | null;
};

function birthForPerson(
  person: PersonLike,
  timeline: TimelineLike[],
): TimelineLike | undefined {
  const byLink = timeline.find(
    (event) =>
      (event.linkedIds ?? []).includes(person.id) &&
      /nasc|birth|nasceu/i.test(`${event.title} ${event.note}`),
  );
  if (byLink) return byLink;
  const name = person.title.trim().toLowerCase();
  if (name.length < 2) return undefined;
  return timeline.find(
    (event) =>
      /nasc|birth|nasceu/i.test(`${event.title} ${event.note}`) &&
      (`${event.title} ${event.note}`.toLowerCase().includes(name) ||
        (event.linkedIds ?? []).includes(person.id)),
  );
}

/** Expected age of each person at each dated timeline event (from birth + year). */
export function agesOnTimeline(input: {
  people: PersonLike[];
  timeline?: TimelineLike[];
}): TimelineAgeRow[] {
  const timeline = input.timeline ?? [];
  const rows: TimelineAgeRow[] = [];
  for (const person of input.people.filter((item) => item.kind === "pessoa")) {
    const stated = ageYears(person.age);
    const birth = birthForPerson(person, timeline);
    const birthYear = birth ? yearOf(birth.when) : null;
    for (const event of timeline) {
      const eventYear = yearOf(event.when);
      if (birthYear == null || eventYear == null) continue;
      const expected = eventYear - birthYear;
      if (expected < 0 || expected > 120) continue;
      const drift =
        stated != null ? expected - stated : null;
      rows.push({
        eventId: event.id,
        personId: person.id,
        personTitle: person.title,
        stated,
        expected,
        birthWhen: birth?.when ?? null,
        drift,
      });
    }
  }
  return rows;
}

/** Age consistency: ficha age vs timeline years + ages mentioned in chapters. */
export function ageContinuity(input: {
  chapters: ChapterLike[];
  people: PersonLike[];
  timeline?: TimelineLike[];
}): ContinuityFlag[] {
  const flags: ContinuityFlag[] = [];

  for (const row of agesOnTimeline(input)) {
    if (row.stated == null || row.drift == null || Math.abs(row.drift) < 2) continue;
    const event = (input.timeline ?? []).find((item) => item.id === row.eventId);
    if (!event) continue;
    const linked = (event.chapterIds ?? []).length
      ? input.chapters.filter((chapter) => (event.chapterIds ?? []).includes(chapter.id))
      : [];
    flags.push({
      id: `age-${row.personId}-${row.eventId}`,
      severity: "warn",
      title: "Idade vs cronologia",
      detail: `${row.personTitle} tem ${row.stated} anos na ficha, mas em «${event.title}» (${event.when}) deveria ter ~${row.expected} anos segundo o nascimento (${row.birthWhen}).`,
      chapterIds: linked.map((item) => item.id),
    });
  }

  for (const person of input.people.filter((item) => item.kind === "pessoa")) {
    const stated = ageYears(person.age);
    const name = person.title.trim();
    if (name.length < 2 || stated == null) continue;
    const re = new RegExp(
      `${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^.\\n]{0,24}(?:tinha|tem|com)\\s+(\\d{1,2})\\s+anos`,
      "i",
    );
    for (const chapter of input.chapters) {
      const match = plainText(chapter.body).match(re);
      if (!match) continue;
      const mentioned = Number(match[1]);
      if (Math.abs(mentioned - stated) >= 2) {
        flags.push({
          id: `age-text-${person.id}-${chapter.id}`,
          severity: "warn",
          title: "Idade no texto",
          detail: `Em «${chapter.title}», ${name} aparece com ${mentioned} anos; a ficha diz ${stated}.`,
          chapterIds: [chapter.id],
        });
      }
    }
  }
  return flags;
}

/** Heuristic continuity scan over manuscript + world + bible + timeline. */
export function scanContinuity(input: {
  chapters: ChapterLike[];
  people: PersonLike[];
  bible?: BibleLike | null;
  timeline?: TimelineLike[];
}): ContinuityFlag[] {
  const flags: ContinuityFlag[] = [];
  const texts = input.chapters.map((chapter) => ({
    ...chapter,
    plain: plainText(chapter.body).toLowerCase(),
  }));

  flags.push(...ageContinuity(input));

  for (const person of input.people.filter((item) => item.kind === "pessoa")) {
    const name = person.title.trim();
    if (name.length < 2) continue;

    const leftHits = texts.filter(
      (chapter) =>
        chapter.plain.includes(name.toLowerCase()) &&
        /cicatriz[^\n.]{0,48}esquerda|mão esquerda[^\n.]{0,24}cicatriz/.test(chapter.plain),
    );
    const rightHits = texts.filter(
      (chapter) =>
        chapter.plain.includes(name.toLowerCase()) &&
        /cicatriz[^\n.]{0,48}direita|mão direita[^\n.]{0,24}cicatriz/.test(chapter.plain),
    );
    if (leftHits.length && rightHits.length) {
      flags.push({
        id: `scar-${person.id}`,
        severity: "warn",
        title: "Possível inconsistência",
        detail: `Em «${leftHits[0].title}», a cicatriz de ${name} parece na mão esquerda; em «${rightHits[0].title}», na direita.`,
        chapterIds: [leftHits[0].id, rightHits[0].id],
      });
    }

    const neverPortugal = texts.filter(
      (chapter) =>
        chapter.plain.includes(name.toLowerCase()) &&
        /nunca (esteve|estive|foi) (em )?portugal|nunca (conheceu|conheci) portugal/.test(
          chapter.plain,
        ),
    );
    const wasPortugal = texts.filter(
      (chapter) =>
        chapter.plain.includes(name.toLowerCase()) &&
        /(em|a) lisboa|portugal|chegou a portugal|esteve em portugal/.test(chapter.plain),
    );
    if (neverPortugal.length && wasPortugal.length) {
      flags.push({
        id: `pt-${person.id}`,
        severity: "warn",
        title: "Continuidade · Portugal",
        detail: `${name} diz não ter estado em Portugal em «${neverPortugal[0].title}», mas aparece ligado a Portugal/Lisboa em «${wasPortugal[0].title}».`,
        chapterIds: [neverPortugal[0].id, wasPortugal[0].id],
      });
    }

    // Secret known by others incorrectly: "X não sabe" vs later "X sabia"
    if (person.secret?.trim()) {
      const unaware = texts.filter((chapter) =>
        new RegExp(`${name.toLowerCase()}[^.\\n]{0,40}não (sabe|sabia|conhecia)`).test(
          chapter.plain,
        ),
      );
      const aware = texts.filter((chapter) =>
        new RegExp(`${name.toLowerCase()}[^.\\n]{0,40}(já )?sab(e|ia)|${name.toLowerCase()} descobriu`).test(
          chapter.plain,
        ),
      );
      if (unaware.length && aware.length) {
        const firstUnaware = unaware[0];
        const laterAware = aware.find(
          (chapter) =>
            input.chapters.findIndex((c) => c.id === chapter.id) >
            input.chapters.findIndex((c) => c.id === firstUnaware.id),
        );
        if (laterAware) {
          flags.push({
            id: `know-${person.id}`,
            severity: "info",
            title: "Quem sabe o quê",
            detail: `${name}: em «${firstUnaware.title}» parece não saber; em «${laterAware.title}» já sabe. Confirma se a revelação foi intencional.`,
            chapterIds: [firstUnaware.id, laterAware.id],
          });
        }
      }
    }
  }

  if (input.bible?.rules?.length) {
    for (const rule of input.bible.rules.slice(0, 3)) {
      if (rule.trim().length < 12) continue;
      flags.push({
        id: `rule-${hash(rule)}`,
        severity: "info",
        title: "Regra da bíblia",
        detail: rule.trim(),
        chapterIds: [],
      });
    }
  }

  if (input.bible?.tone) {
    flags.push({
      id: `tone-${hash(input.bible.tone)}`,
      severity: "info",
      title: "Tom do autor",
      detail: `Tom oficial: ${input.bible.tone}. Sugestões de prosa devem preservar isto.`,
      chapterIds: [],
    });
  }

  const warns = flags.filter((item) => item.severity === "warn");
  const infos = flags.filter((item) => item.severity === "info").slice(0, 4);
  return [...warns, ...infos].slice(0, 16);
}

/** Style fingerprint from manuscript for rewrite prompts. */
export function styleFingerprint(chapters: ChapterLike[]): string {
  const sample = chapters
    .map((chapter) => plainText(chapter.body))
    .filter(Boolean)
    .join("\n")
    .slice(0, 2400);
  if (!sample.trim()) return "Estilo ainda indefinido — frases curtas, concretas.";
  const words = sample.split(/\s+/).length;
  const sentences = sample.split(/[.!?]+/).filter((item) => item.trim().length > 8);
  const avg = sentences.length ? words / sentences.length : 12;
  const first = /eu |meu |minha |nós /.test(sample.toLowerCase());
  return [
    first ? "Voz próxima da primeira pessoa / interioridade." : "Voz mais distanciada / terceira.",
    avg < 12 ? "Frases curtas, ritmo cortado." : avg > 22 ? "Frases longas, respiração ampla." : "Frases de comprimento médio.",
    /,…|, e |; /.test(sample) ? "Usa pausas e subordinação." : "Prefere coordenação simples.",
  ].join(" ");
}

/** Local rewrite that returns actual alternate prose (not advice). */
export function rewriteSelection(
  selection: string,
  intent: "tenser" | "clearer" | "quieter" = "tenser",
  styleHint = "",
): string {
  let text = selection.trim();
  if (!text) return "";

  // Light touch transforms that preserve meaning
  text = text
    .replace(/\b(muito|bastante|realmente|extremamente)\s+/gi, "")
    .replace(/\bcomeçou a\s+/gi, "")
    .replace(/\bsentia que\s+/gi, "")
    .replace(/\bparecia que\s+/gi, "");

  if (intent === "tenser") {
    text = text
      .replace(/\bsorriso\b/gi, "linha na boca")
      .replace(/\bolhou para\b/gi, "fixou")
      .replace(/\bdepois\b/gi, "aí")
      .replace(/\bde repente\b/gi, "");
    if (!/[.!?…]$/.test(text)) text = `${text}.`;
    // Prefer shorter clauses
    if (text.length > 90 && text.includes(",")) {
      const [head, ...rest] = text.split(",");
      text = `${head.trim()}. ${rest.join(",").trim()}`;
    }
  } else if (intent === "clearer") {
    text = text.replace(/\s+/g, " ").replace(/\s+,/g, ",");
  } else {
    text = text.replace(/\b(gritou|explodiu|bateu)\b/gi, (m) => m.toLowerCase());
  }

  if (styleHint.toLowerCase().includes("curtas") && text.includes(" e ")) {
    text = text.replace(/\s+e\s+/i, ". ");
  }

  // Capitalize first letter
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (text === selection.trim()) {
    // Guarantee a distinct suggestion
    text = text.replace(/\.$/, "");
    text = intent === "tenser" ? `${text} — e não olhou para trás.` : `${text}.`;
  }
  return text.trim();
}

/** Pull candidate facts while writing (not only on closed chapters). */
export function extractMemoryFacts(chapter: ChapterLike, limit = 6): MemoryFact[] {
  const plain = [
    plainText(chapter.body),
    ...(chapter.scenes ?? []).map((scene) => plainText(scene.body)),
  ]
    .filter(Boolean)
    .join("\n\n");
  if (!plain.trim()) return [];

  // Só frases fechadas — evita capturar cada tecla a meio da palavra.
  const sentences = plain
    .split(/(?<=[.!?…])\s+/)
    .map((item) => item.trim())
    .filter(
      (item) =>
        item.length > 24 &&
        item.length < 200 &&
        /[.!?…]["»']?$/.test(item),
    );

  const cues =
    /(descobriu|soube|revelou|confessou|decidiu|nunca|sempre|segredo|pai|mãe|amor|regress|mentiu|é na verdade|não é|afinal|percebeu|entendeu|prometeu|jur|escond)/i;

  return sentences
    .filter((sentence) => cues.test(sentence))
    .slice(0, limit)
    .map((text) => ({
      id: `${chapter.id}-${hash(text)}`,
      text,
      chapterId: chapter.id,
      chapterTitle: chapter.title || "Sem título",
    }));
}

/** Collapse pending drafts that are prefixes of a newer fact (typing noise). */
export function collapseMemoryPrefixDupes<T extends { id: string; text: string; chapterId: string; status?: string }>(
  items: T[],
): T[] {
  const pending = items.filter((item) => !item.status || item.status === "pending");
  const settled = items.filter((item) => item.status && item.status !== "pending");
  const kept: T[] = [];

  for (const fact of pending) {
    const norm = fact.text.replace(/\s+/g, " ").trim().toLowerCase();
    const superseded = pending.some((other) => {
      if (other.id === fact.id || other.chapterId !== fact.chapterId) return false;
      const otherNorm = other.text.replace(/\s+/g, " ").trim().toLowerCase();
      if (otherNorm === norm) return other.text.length > fact.text.length;
      return otherNorm.startsWith(norm) && otherNorm.length > norm.length;
    });
    if (!superseded && !kept.some((k) => k.text.replace(/\s+/g, " ").trim().toLowerCase() === norm)) {
      kept.push(fact);
    }
  }

  return [...settled, ...kept];
}

/** Answer simple book questions with local retrieval (no model required). */
export function askTheBook(
  question: string,
  input: {
    chapters: ChapterLike[];
    people: PersonLike[];
    timeline?: TimelineLike[];
    bible?: BibleLike | null;
  },
): string {
  const q = question.trim().toLowerCase();
  if (!q) return "Faz uma pergunta concreta sobre o livro.";

  if (/quem sabe|segredo/.test(q)) {
    const map = knowledgeMap(input);
    if (!map.length) return "Ainda não há segredos claros nas fichas do Mundo.";
    return map
      .slice(0, 6)
      .map((edge) => `• ${edge.knower} · ${edge.secret}`)
      .join("\n");
  }

  if (/idade|quantos anos/.test(q)) {
    const person = input.people.find((item) => q.includes(item.title.toLowerCase()));
    if (person?.age) {
      const ageFlags = ageContinuity(input).filter((flag) =>
        flag.detail.includes(person.title),
      );
      const base = `${person.title} tem ${person.age} (ficha do mundo).`;
      return ageFlags.length ? `${base}\n⚠ ${ageFlags[0].detail}` : base;
    }
    if (person) return `Ainda não há idade definida para ${person.title} na ficha.`;
  }

  if (/estilo|tom|voz/.test(q)) {
    return styleFingerprint(input.chapters);
  }

  if (/onde|aparece|capítulos?/.test(q)) {
    const place = (input.bible?.places ?? []).find((item) => q.includes(item.toLowerCase()));
    const needle = place?.toLowerCase() || extractQuoted(q) || longestToken(q);
    if (needle && needle.length > 2) {
      const hits = input.chapters.filter((chapter) =>
        plainText(chapter.body).toLowerCase().includes(needle),
      );
      if (hits.length) {
        return `«${needle}» aparece em: ${hits.map((item) => item.title || "Sem título").join(", ")}.`;
      }
    }
  }

  if (/última vez|quando.*falou|pai/.test(q)) {
    const hits = input.chapters.filter((chapter) =>
      /pai|father/.test(plainText(chapter.body).toLowerCase()),
    );
    if (hits.length) {
      const last = hits[hits.length - 1];
      return `A menção mais recente ao pai que encontrei está em «${last.title || "Sem título"}».`;
    }
  }

  if (/inconsist|continuidade/.test(q)) {
    const flags = scanContinuity(input).filter((item) => item.severity === "warn");
    if (!flags.length) return "Não encontrei inconsistências óbvias com as heurísticas actuais.";
    return flags.map((flag) => `• ${flag.title}: ${flag.detail}`).join("\n");
  }

  if (/tema|tom|narrador|época|regra/.test(q) && input.bible) {
    const bits = [
      input.bible.era && `Época: ${input.bible.era}`,
      input.bible.narrator && `Narrador: ${input.bible.narrator}`,
      input.bible.tone && `Tom: ${input.bible.tone}`,
      input.bible.themes?.length && `Temas: ${input.bible.themes.join(", ")}`,
      input.bible.rules?.[0] && `Regra: ${input.bible.rules[0]}`,
    ].filter(Boolean);
    if (bits.length) return bits.join("\n");
  }

  const token = longestToken(q);
  if (token.length > 3) {
    const hits = input.chapters.filter((chapter) =>
      plainText(chapter.body).toLowerCase().includes(token),
    );
    if (hits.length) {
      const sample = plainText(hits[0].body).slice(0, 180);
      return `Encontrei «${token}» em ${hits.length} capítulo(s). Ex.: «${hits[0].title}» — ${sample}…`;
    }
  }

  return "Ainda não sei responder a isto com confiança. Experimenta nomes, idades, segredos ou «inconsistências».";
}

function extractQuoted(value: string) {
  const match = value.match(/[«"]([^»"]+)[»"]/);
  return match?.[1]?.toLowerCase() ?? "";
}

function longestToken(value: string) {
  return (
    value
      .split(/[^a-zA-ZÀ-ÿ0-9]+/)
      .filter((item) => item.length > 2)
      .sort((a, b) => b.length - a.length)[0] ?? ""
  );
}

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/** Crude per-chapter tension score 0–10 from conflict lexicon. */
export function chapterTension(body: string): number {
  const text = plainText(body).toLowerCase();
  if (!text.trim()) return 0;
  const hits = (
    text.match(
      /morte|sangue|grita|medo|ódio|foge|perigo|mentira|segredo|briga|bate|chora|desesper|ameaça|traiç|guerra|dor/g,
    ) ?? []
  ).length;
  const density = hits / Math.max(1, text.split(/\s+/).length / 80);
  return Math.max(0, Math.min(10, Math.round(density * 3 + (hits > 0 ? 2 : 0))));
}
