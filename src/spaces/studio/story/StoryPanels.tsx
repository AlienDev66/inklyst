import {
  ageContinuity,
  agesOnTimeline,
  askTheBook,
  chapterTension,
  knowledgeMap,
  plainText,
  scanContinuity,
} from "@pagina/domain";
import {
  BookOpen,
  Heart,
  Link2,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  SHEET_LABEL,
  STATUS_LABEL,
  type Book,
  type Chapter,
  type ResearchNote,
  type SheetKind,
  type StoryBible,
} from "../books";
import { useBooks } from "../store";

export function WorldSheet({
  book,
  note,
}: {
  book: Book;
  note: ResearchNote;
}) {
  const store = useBooks();
  const people = book.research.filter((item) => item.kind === "pessoa" && item.id !== note.id);

  function patch(partial: Partial<ResearchNote>) {
    store.patchResearch(book.id, note.id, partial);
  }

  return (
    <div className="world-sheet">
      <p className="eyebrow">{SHEET_LABEL[note.kind]}</p>
      <input
        className="chapter-title"
        value={note.title}
        aria-label="Nome"
        onChange={(event) => patch({ title: event.target.value })}
      />

      {note.kind === "pessoa" ? (
        <div className="world-grid">
          <label className="inline-field">
            <span>Idade</span>
            <input value={note.age ?? ""} onChange={(e) => patch({ age: e.target.value })} placeholder="24 anos" />
          </label>
          <label className="inline-field">
            <span>Papel</span>
            <input value={note.role ?? ""} onChange={(e) => patch({ role: e.target.value })} placeholder="Protagonista" />
          </label>
          <label className="inline-field">
            <span>De</span>
            <input value={note.from ?? ""} onChange={(e) => patch({ from: e.target.value })} placeholder="Luanda" />
          </label>
          <label className="inline-field">
            <span>Para</span>
            <input value={note.to ?? ""} onChange={(e) => patch({ to: e.target.value })} placeholder="Lisboa" />
          </label>
        </div>
      ) : null}

      {note.kind === "pessoa" || note.kind === "evento" ? (
        <div className="world-facts">
          <label className="fact-block">
            <span>Objetivo</span>
            <textarea
              value={note.goal ?? ""}
              placeholder="O que quer construir ou evitar."
              onChange={(e) => patch({ goal: e.target.value })}
            />
          </label>
          <label className="fact-block">
            <span>Medo</span>
            <textarea
              value={note.fear ?? ""}
              placeholder="O que o persegue."
              onChange={(e) => patch({ fear: e.target.value })}
            />
          </label>
          <label className="fact-block">
            <span>Segredo</span>
            <textarea
              value={note.secret ?? ""}
              placeholder="Ainda não definido."
              onChange={(e) => patch({ secret: e.target.value })}
            />
          </label>
        </div>
      ) : null}

      {note.kind === "pessoa" ? (
        <div className="rel-block">
          <p className="eyebrow">Relacionamentos</p>
          {(note.links ?? []).map((link, index) => {
            const target = book.research.find((item) => item.id === link.toId);
            return (
              <div key={`${link.toId}-${index}`} className="rel-row">
                <select
                  value={link.toId}
                  aria-label="Pessoa ligada"
                  onChange={(e) => {
                    const links = [...(note.links ?? [])];
                    links[index] = { ...link, toId: e.target.value };
                    patch({ links });
                  }}
                >
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.title || "Sem nome"}
                    </option>
                  ))}
                  {!people.find((p) => p.id === link.toId) && target ? (
                    <option value={link.toId}>{target.title}</option>
                  ) : null}
                </select>
                <select
                  value={link.tone || "outro"}
                  aria-label="Tipo de relação"
                  onChange={(e) => {
                    const tone = e.target.value;
                    const links = [...(note.links ?? [])];
                    const labels: Record<string, string> = {
                      amor: "interesse amoroso",
                      amigo: "melhor amigo",
                      conflito: "conflituoso",
                      familia: "família",
                      segredo: "segredo",
                      outro: link.label || "ligado",
                    };
                    links[index] = { ...link, tone, label: labels[tone] || link.label };
                    patch({ links });
                  }}
                >
                  <option value="amor">❤️ Amor</option>
                  <option value="amigo">🤝 Amizade</option>
                  <option value="conflito">⚡ Conflito</option>
                  <option value="familia">🩸 Família</option>
                  <option value="segredo">🤫 Segredo</option>
                  <option value="outro">· Outro</option>
                </select>
                <input
                  value={link.label}
                  placeholder="rótulo"
                  onChange={(e) => {
                    const links = [...(note.links ?? [])];
                    links[index] = { ...link, label: e.target.value };
                    patch({ links });
                  }}
                />
                <button
                  type="button"
                  className="icon-btn tiny"
                  aria-label="Remover relação"
                  onClick={() => patch({ links: (note.links ?? []).filter((_, i) => i !== index) })}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="text-btn"
            disabled={people.length === 0}
            onClick={() =>
              patch({
                links: [
                  ...(note.links ?? []),
                  { toId: people[0]?.id ?? "", label: "", tone: "" },
                ],
              })
            }
          >
            + Relação
          </button>
        </div>
      ) : null}

      {(note.kind === "evento" || note.kind === "lugar") && (
        <label className="inline-field">
          <span>Quando / onde</span>
          <input
            value={note.kind === "evento" ? note.when ?? "" : note.where ?? ""}
            onChange={(e) =>
              patch(note.kind === "evento" ? { when: e.target.value } : { where: e.target.value })
            }
          />
        </label>
      )}

      <label className="fact-block">
        <span>Notas</span>
        <textarea
          className="world-notes"
          value={note.body}
          aria-label="Notas"
          placeholder="Notas livres — a IA lê isto como verdade do mundo."
          onChange={(e) => patch({ body: e.target.value })}
        />
      </label>
    </div>
  );
}

export function BiblePanel({ book }: { book: Book }) {
  const store = useBooks();
  const bible = book.bible;

  function patch(partial: Partial<StoryBible>) {
    store.patchBook(book.id, { bible: { ...bible, ...partial } });
  }

  function listField(key: "places" | "themes" | "rules" | "truths", label: string, placeholder: string) {
    const value = (bible[key] ?? []).join("\n");
    return (
      <label className="fact-block">
        <span>{label}</span>
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) =>
            patch({
              [key]: e.target.value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
    );
  }

  return (
    <div className="bible-panel">
      <p className="eyebrow">Bíblia do livro</p>
      <h2 className="chapter-title static">{book.title}</h2>
      <p className="fine">Verdades oficiais deste universo. O assistente não as deve contrariar sem avisar.</p>

      <div className="world-grid">
        <label className="inline-field">
          <span>Época</span>
          <input value={bible.era} onChange={(e) => patch({ era: e.target.value })} placeholder="2003–2037" />
        </label>
        <label className="inline-field">
          <span>Narrador</span>
          <input
            value={bible.narrator}
            onChange={(e) => patch({ narrator: e.target.value })}
            placeholder="Primeira pessoa"
          />
        </label>
        <label className="inline-field wide">
          <span>Tom</span>
          <input
            value={bible.tone}
            onChange={(e) => patch({ tone: e.target.value })}
            placeholder="Melancólico / esperançoso"
          />
        </label>
      </div>

      {listField("places", "Locais principais", "Um por linha")}
      {listField("themes", "Temas", "Migração\nFamília\nIdentidade")}
      {listField("rules", "Regras importantes", "O leitor só descobre X através de…")}
      {listField("truths", "Verdades oficiais", "Factos que a história não pode contradizer")}
    </div>
  );
}

export function StructureBoard({
  book,
  onOpenChapter,
}: {
  book: Book;
  onOpenChapter: (id: string) => void;
}) {
  const store = useBooks();
  const [view, setView] = useState<"acts" | "cards">("acts");
  const [dragId, setDragId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const known = new Set(book.parts.map((p) => p.id));
    return [
      ...book.parts.map((part) => ({
        part,
        chapters: book.chapters.filter((c) => c.partId === part.id),
      })),
      {
        part: null as (typeof book.parts)[number] | null,
        chapters: book.chapters.filter((c) => !c.partId || !known.has(c.partId)),
      },
    ].filter((g) => g.part || g.chapters.length > 0);
  }, [book.chapters, book.parts]);

  return (
    <div className="structure-board">
      <header className="structure-head">
        <div>
          <p className="eyebrow">Estrutura</p>
          <h2>{book.title}</h2>
        </div>
        <div className="mode-toggle">
          <button type="button" className={view === "acts" ? "filter on" : "filter"} onClick={() => setView("acts")}>
            Actos
          </button>
          <button type="button" className={view === "cards" ? "filter on" : "filter"} onClick={() => setView("cards")}>
            Cartões
          </button>
        </div>
      </header>

      {view === "acts" ? (
        <div className="act-stack">
          {groups.map((group, actIndex) => (
            <section key={group.part?.id ?? "loose"} className="act-block">
              <h3>
                {group.part
                  ? group.part.title || `Acto ${roman(actIndex + 1)}`
                  : book.parts.length
                    ? "Sem acto"
                    : "Manuscrito"}
              </h3>
              <ol className="act-chapters">
                {group.chapters.map((item) => {
                  const index = book.chapters.findIndex((c) => c.id === item.id);
                  return (
                    <li
                      key={item.id}
                      draggable
                      className={dragId === item.id ? "dragging" : undefined}
                      onDragStart={() => setDragId(item.id)}
                      onDragEnd={() => setDragId(null)}
                      onDragOver={(e) => {
                        if (!dragId || dragId === item.id) return;
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragId && dragId !== item.id) store.moveChapterTo(book.id, dragId, item.id);
                        setDragId(null);
                      }}
                    >
                      <button type="button" onClick={() => onOpenChapter(item.id)}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{item.title || "Sem título"}</strong>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {!book.parts.length ? (
            <button
              type="button"
              className="text-btn"
              onClick={() => store.addPart(book.id)}
            >
              + Criar acto / parte
            </button>
          ) : null}
        </div>
      ) : (
        <div className="cork structure-cork">
          {book.chapters.map((item, index) => (
            <article key={item.id} className="index-card structure-card">
              <header>
                <span>Capítulo {String(index + 1).padStart(2, "0")}</span>
                <span className={`pill ${item.status}`}>{STATUS_LABEL[item.status]}</span>
              </header>
              <button type="button" className="card-name" onClick={() => onOpenChapter(item.id)}>
                {item.title || "Sem título"}
              </button>
              <label>
                Objetivo
                <textarea
                  value={item.objective ?? ""}
                  placeholder="O que este capítulo precisa fazer."
                  onChange={(e) => store.patchChapter(book.id, item.id, { objective: e.target.value })}
                />
              </label>
              <label>
                Conflito
                <textarea
                  value={item.conflict ?? ""}
                  placeholder="O que se opõe."
                  onChange={(e) => store.patchChapter(book.id, item.id, { conflict: e.target.value })}
                />
              </label>
              <label>
                Revelação
                <textarea
                  value={item.reveal ?? ""}
                  placeholder="O que o leitor (ou a personagem) descobre."
                  onChange={(e) => store.patchChapter(book.id, item.id, { reveal: e.target.value })}
                />
              </label>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function TimelineBoard({
  book,
  selectedId,
  onSelect,
}: {
  book: Book;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const store = useBooks();
  const people = book.research.filter((n) => n.kind === "pessoa");
  const ordered = [...book.timeline].sort(
    (a, b) => a.when.localeCompare(b.when) || a.title.localeCompare(b.title),
  );
  const selected = ordered.find((e) => e.id === selectedId) ?? ordered[0] ?? null;
  const ageRows = useMemo(
    () => agesOnTimeline({ people: book.research, timeline: book.timeline }),
    [book.research, book.timeline],
  );
  const ageFlags = useMemo(
    () =>
      ageContinuity({
        chapters: book.chapters,
        people: book.research,
        timeline: book.timeline,
      }).filter((flag) => flag.title.startsWith("Idade")),
    [book.chapters, book.research, book.timeline],
  );
  const agesHere = selected
    ? ageRows.filter((row) => row.eventId === selected.id)
    : [];

  if (!ordered.length) {
    return (
      <div className="story-empty">
        <div className="story-empty-visual timeline-empty-visual" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <p className="eyebrow">Cronologia</p>
        <h2>O tempo deste livro</h2>
        <p>
          Marca nascimentos (com ano), partidas e regressos. Liga pessoas e capítulos — o Inklyst
          calcula a idade em cada data e avisa se a ficha não bate certo.
        </p>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => onSelect(store.addTimeline(book.id))}
        >
          Primeiro acontecimento
        </button>
      </div>
    );
  }

  return (
    <div className="timeline-board">
      <div className="timeline-rail">
        {ordered.map((event) => {
          const warn = ageFlags.some((flag) => flag.id.includes(event.id));
          return (
            <button
              key={event.id}
              type="button"
              className={event.id === selected?.id ? "tl-node on" : "tl-node"}
              onClick={() => onSelect(event.id)}
            >
              <span className="tl-when">{event.when || "—"}</span>
              <span className="tl-line" aria-hidden />
              <span className="tl-copy">
                <strong>
                  {event.title || "Sem título"}
                  {warn ? " · ⚠ idade" : ""}
                </strong>
                {(event.chapterIds ?? []).length ? (
                  <small>
                    Caps.{" "}
                    {(event.chapterIds ?? [])
                      .map((id) => {
                        const i = book.chapters.findIndex((c) => c.id === id);
                        return i >= 0 ? String(i + 1).padStart(2, "0") : null;
                      })
                      .filter(Boolean)
                      .join(", ")}
                  </small>
                ) : (
                  <small>Sem capítulos ligados</small>
                )}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          className="text-btn tl-add"
          onClick={() => onSelect(store.addTimeline(book.id))}
        >
          + Acontecimento
        </button>
      </div>

      {selected ? (
        <div className="timeline-detail">
          <input
            className="chapter-title"
            value={selected.title}
            onChange={(e) => store.patchTimeline(book.id, selected.id, { title: e.target.value })}
          />
          <label className="inline-field">
            <span>Quando</span>
            <input
              value={selected.when}
              placeholder="1991 · 2026 · Três semanas antes"
              onChange={(e) => store.patchTimeline(book.id, selected.id, { when: e.target.value })}
            />
          </label>
          <textarea
            className="fact-area"
            value={selected.note}
            placeholder="O que muda no mundo neste momento. Para nascimentos, usa «nasceu» no título ou nota."
            onChange={(e) => store.patchTimeline(book.id, selected.id, { note: e.target.value })}
          />

          <div className="chapter-link-grid">
            <p className="eyebrow">Pessoas neste momento</p>
            {people.length ? (
              people.map((person) => {
                const on = (selected.linkedIds ?? []).includes(person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    className={on ? "story-chip on" : "story-chip"}
                    onClick={() => {
                      const set = new Set(selected.linkedIds ?? []);
                      if (on) set.delete(person.id);
                      else set.add(person.id);
                      store.patchTimeline(book.id, selected.id, { linkedIds: [...set] });
                    }}
                  >
                    {person.title || "Sem nome"}
                    {person.age ? ` · ${person.age}` : ""}
                  </button>
                );
              })
            ) : (
              <p className="fine">Cria pessoas no Mundo para as ligares aqui.</p>
            )}
          </div>

          {agesHere.length ? (
            <div className="age-at-event">
              <p className="eyebrow">Idade neste ano</p>
              <ul>
                {agesHere.map((row) => {
                  const drift = row.drift != null && Math.abs(row.drift) >= 2;
                  return (
                    <li key={`${row.eventId}-${row.personId}`} className={drift ? "warn" : ""}>
                      <strong>{row.personTitle}</strong>
                      <span>
                        ~{row.expected} anos neste momento
                        {row.stated != null ? ` · ficha: ${row.stated}` : " · sem idade na ficha"}
                        {row.birthWhen ? ` · nasc. ${row.birthWhen}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="fine">
                Marca um acontecimento com «nasceu» + ano e liga a pessoa — a idade nos outros
                eventos calcula-se sozinha.
              </p>
            </div>
          ) : (
            <p className="fine age-hint">
              Para detecção de idade: acontecimento de nascimento com ano (ex. 1991) + idade na
              ficha da pessoa.
            </p>
          )}

          {ageFlags.length ? (
            <div className="age-flags">
              <p className="eyebrow">Avisos de idade</p>
              <ul>
                {ageFlags.slice(0, 6).map((flag) => (
                  <li key={flag.id}>{flag.detail}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="chapter-link-grid">
            <p className="eyebrow">Capítulos ligados</p>
            {book.chapters.map((chapter, index) => {
              const on = (selected.chapterIds ?? []).includes(chapter.id);
              return (
                <button
                  key={chapter.id}
                  type="button"
                  className={on ? "story-chip on" : "story-chip"}
                  onClick={() => {
                    const set = new Set(selected.chapterIds ?? []);
                    if (on) set.delete(chapter.id);
                    else set.add(chapter.id);
                    store.patchTimeline(book.id, selected.id, { chapterIds: [...set] });
                  }}
                >
                  {String(index + 1).padStart(2, "0")} · {chapter.title || "Sem título"}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="text-btn danger"
            onClick={() => {
              store.removeTimeline(book.id, selected.id);
              onSelect(book.timeline.find((item) => item.id !== selected.id)?.id ?? "");
            }}
          >
            Remover da cronologia
          </button>
        </div>
      ) : null}
    </div>
  );
}

const TONE_META: Record<string, { mark: string; label: string; defaultLabel: string }> = {
  amor: { mark: "❤️", label: "Amor", defaultLabel: "interesse amoroso" },
  amigo: { mark: "🤝", label: "Amizade", defaultLabel: "melhor amigo" },
  conflito: { mark: "⚡", label: "Conflito", defaultLabel: "conflituoso" },
  familia: { mark: "🩸", label: "Família", defaultLabel: "família" },
  segredo: { mark: "🤫", label: "Segredo", defaultLabel: "segredo" },
  outro: { mark: "·", label: "Outro", defaultLabel: "ligado" },
};

function toneMark(tone: string) {
  return TONE_META[tone]?.mark ?? "·";
}

/** Stable circle position from id — ordem fixa por id. */
function nodeSlot(ids: string[], id: string) {
  const sorted = [...ids].sort();
  const index = Math.max(0, sorted.indexOf(id));
  const count = Math.max(sorted.length, 1);
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  const radius = count === 1 ? 0 : count === 2 ? 30 : count <= 5 ? 34 : 38;
  return {
    x: 50 + Math.cos(angle) * radius,
    y: 48 + Math.sin(angle) * radius * 0.92,
  };
}

export function RelationGraph({
  book,
  onOpenWorld,
}: {
  book: Book;
  onOpenWorld?: (noteId?: string) => void;
}) {
  const store = useBooks();
  const people = useMemo(
    () => book.research.filter((n) => n.kind === "pessoa"),
    [book.research],
  );
  const ids = useMemo(() => people.map((p) => p.id), [people]);
  const [focus, setFocus] = useState<string | null>(null);
  const active = people.find((p) => p.id === (focus ?? people[0]?.id)) ?? people[0] ?? null;
  const [linkTo, setLinkTo] = useState("");
  const [linkTone, setLinkTone] = useState("amor");

  const nodes = useMemo(() => {
    return people.map((person) => {
      const slot = nodeSlot(ids, person.id);
      return { person, ...slot };
    });
  }, [people, ids]);

  const edges = useMemo(() => {
    const seen = new Set<string>();
    const pairCount = new Map<string, number>();
    const list: {
      key: string;
      from: ResearchNote;
      to: ResearchNote;
      label: string;
      tone: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      cx: number;
      cy: number;
      mx: number;
      my: number;
    }[] = [];
    for (const node of nodes) {
      for (const link of node.person.links ?? []) {
        const other = nodes.find((item) => item.person.id === link.toId);
        if (!other) continue;
        const pair = [node.person.id, other.person.id].sort().join("::");
        const tone = String(link.tone || "outro");
        const key = `${pair}::${tone}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const sibling = pairCount.get(pair) ?? 0;
        pairCount.set(pair, sibling + 1);
        const x1 = node.x;
        const y1 = node.y;
        const x2 = other.x;
        const y2 = other.y;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        // Curva suave perpendicular ao segmento; pares com várias arestas alternam lado.
        const side = sibling % 2 === 0 ? 1 : -1;
        const stack = 1 + Math.floor(sibling / 2) * 0.55;
        const bend = Math.min(9, Math.max(2.5, len * 0.14)) * side * stack;
        const cx = (x1 + x2) / 2 - (dy / len) * bend;
        const cy = (y1 + y2) / 2 + (dx / len) * bend;
        // Meio da curva Q (não o control point — senão o emoji “flutua”).
        const mx = 0.25 * x1 + 0.5 * cx + 0.25 * x2;
        const my = 0.25 * y1 + 0.5 * cy + 0.25 * y2;
        list.push({
          key,
          from: node.person,
          to: other.person,
          label: link.label || TONE_META[tone]?.defaultLabel || "ligado",
          tone,
          x1,
          y1,
          x2,
          y2,
          cx,
          cy,
          mx,
          my,
        });
      }
    }
    return list;
  }, [nodes]);

  function addPerson() {
    const id = store.addResearch(book.id, "pessoa");
    setFocus(id);
    onOpenWorld?.(id);
  }

  function addLinkFromActive() {
    if (!active || !linkTo || linkTo === active.id) return;
    const meta = TONE_META[linkTone] ?? TONE_META.outro;
    const links = [
      ...(active.links ?? []).filter((l) => !(l.toId === linkTo && l.tone === linkTone)),
      { toId: linkTo, label: meta.defaultLabel, tone: linkTone },
    ];
    store.patchResearch(book.id, active.id, { links });
  }

  if (!people.length) {
    return (
      <div className="story-empty">
        <div className="story-empty-visual relations-empty-visual" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <p className="eyebrow">Relações</p>
        <h2>Quem se liga a quem</h2>
        <p>
          O mapa nasce das fichas do Mundo. Cria a primeira pessoa — depois ligas ❤️ amizade 🤝
          conflito ⚡ família 🩸 e segredos 🤫.
        </p>
        <button type="button" className="ghost-btn" onClick={addPerson}>
          Criar primeira pessoa
        </button>
      </div>
    );
  }

  if (people.length === 1 && active) {
    return (
      <div className="relation-solo">
        <article className="solo-card">
          <p className="eyebrow">{active.role || "Personagem"}</p>
          <h2>{active.title || "Sem nome"}</h2>
          <p className="solo-meta">
            {[active.age, active.from && active.to ? `${active.from} → ${active.to}` : active.from || active.to]
              .filter(Boolean)
              .join(" · ") || "Ainda sem idade ou trajecto"}
          </p>
          <div className="solo-facts">
            {active.goal ? (
              <div>
                <span>Objetivo</span>
                <p>{active.goal}</p>
              </div>
            ) : null}
            {active.fear ? (
              <div>
                <span>Medo</span>
                <p>{active.fear}</p>
              </div>
            ) : null}
            {active.secret ? (
              <div>
                <span>Segredo</span>
                <p>{active.secret}</p>
              </div>
            ) : null}
          </div>
          <p className="fine">
            Uma pessoa sozinha ainda não forma um mapa. Acrescenta alguém — as arestas ❤️🤝⚡🩸🤫
            aparecem aqui.
          </p>
          <div className="solo-actions">
            <button type="button" className="ghost-btn" onClick={addPerson}>
              Adicionar pessoa
            </button>
            <button type="button" className="text-btn" onClick={() => onOpenWorld?.(active.id)}>
              Abrir ficha
            </button>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="relation-graph">
      <ul className="graph-legend" aria-label="Tipos de relação">
        {Object.entries(TONE_META)
          .filter(([key]) => key !== "outro")
          .map(([key, meta]) => (
            <li key={key}>
              <span>{meta.mark}</span> {meta.label}
            </li>
          ))}
      </ul>

      <div className="graph-canvas" aria-label="Mapa de relações">
        <svg
          className="graph-edges"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {edges.map((edge) => (
            <path
              key={edge.key}
              d={`M ${edge.x1.toFixed(2)} ${edge.y1.toFixed(2)} Q ${edge.cx.toFixed(2)} ${edge.cy.toFixed(2)} ${edge.x2.toFixed(2)} ${edge.y2.toFixed(2)}`}
              className={`edge-${edge.tone}`}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {edges.map((edge) => (
          <span
            key={`${edge.key}-mark`}
            className={`graph-edge-mark edge-${edge.tone}`}
            style={{ left: `${edge.mx}%`, top: `${edge.my}%` }}
            title={`${edge.from.title || "?"} → ${edge.to.title || "?"} · ${edge.label}`}
          >
            {toneMark(edge.tone)}
          </span>
        ))}
        {nodes.map(({ person, x, y }) => (
          <button
            key={person.id}
            type="button"
            className={person.id === active?.id ? "graph-node on" : "graph-node"}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => setFocus(person.id)}
          >
            <span className="graph-node-name">{person.title || "?"}</span>
            {(person.links ?? []).length ? (
              <span className="graph-node-count">{(person.links ?? []).length}</span>
            ) : null}
          </button>
        ))}
        {!edges.length ? (
          <p className="graph-empty-edges">Sem arestas ainda — escolhe alguém e liga com um tom.</p>
        ) : null}
      </div>

      {active ? (
        <div className="graph-detail">
          <div className="graph-detail-head">
            <div>
              <p className="eyebrow">{active.title}</p>
              <p className="fine">
                {[active.age, active.role].filter(Boolean).join(" · ") || "Sem idade / papel"}
              </p>
            </div>
            <button type="button" className="text-btn" onClick={() => onOpenWorld?.(active.id)}>
              Abrir ficha
            </button>
          </div>

          <div className="graph-quick-link">
            <select
              value={linkTo}
              aria-label="Ligar a"
              onChange={(e) => setLinkTo(e.target.value)}
            >
              <option value="">Ligar a…</option>
              {people
                .filter((p) => p.id !== active.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title || "Sem nome"}
                  </option>
                ))}
            </select>
            <select
              value={linkTone}
              aria-label="Tipo de relação"
              onChange={(e) => setLinkTone(e.target.value)}
            >
              {Object.entries(TONE_META)
                .filter(([key]) => key !== "outro")
                .map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.mark} {meta.label}
                  </option>
                ))}
            </select>
            <button type="button" className="ghost-btn" disabled={!linkTo} onClick={addLinkFromActive}>
              + Aresta
            </button>
          </div>

          <ul className="edge-list">
            {(active.links ?? []).map((link, index) => {
              const other = book.research.find((n) => n.id === link.toId);
              const tone = String(link.tone || "outro");
              const chapters = book.chapters
                .map((c, i) =>
                  plainText(c.body).toLowerCase().includes((active.title || "").toLowerCase()) &&
                  other &&
                  plainText(c.body).toLowerCase().includes((other.title || "").toLowerCase())
                    ? String(i + 1).padStart(2, "0")
                    : null,
                )
                .filter(Boolean);
              return (
                <li key={`${active.id}-${link.toId}-${tone}-${index}`}>
                  <strong>
                    {active.title} ↔ {other?.title || "—"}
                  </strong>
                  <span>
                    {toneMark(tone)} {link.label || TONE_META[tone]?.defaultLabel || "relação"}
                  </span>
                  {chapters.length ? <small>Capítulos: {chapters.join(", ")}</small> : null}
                  <button
                    type="button"
                    className="text-btn danger"
                    onClick={() =>
                      store.patchResearch(book.id, active.id, {
                        links: (active.links ?? []).filter((_, i) => i !== index),
                      })
                    }
                  >
                    Remover
                  </button>
                </li>
              );
            })}
            {!active.links?.length ? (
              <li className="fine">Sem ligações — usa «+ Aresta» ou a ficha no Mundo.</li>
            ) : null}
          </ul>
          <button type="button" className="text-btn" onClick={addPerson}>
            Adicionar pessoa
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ContinuityPanel({ book }: { book: Book }) {
  const flags = useMemo(
    () =>
      scanContinuity({
        chapters: book.chapters,
        people: book.research,
        bible: book.bible,
        timeline: book.timeline.map((t) => ({
          ...t,
          linkedIds: t.linkedIds ?? [],
        })),
      }),
    [book],
  );

  const warns = flags.filter((f) => f.severity === "warn");
  const know = useMemo(
    () => knowledgeMap({ chapters: book.chapters, people: book.research }).slice(0, 4),
    [book],
  );

  return (
    <div className="continuity-panel">
      <p className="eyebrow">Coerência</p>
      <h3>O livro encaixa?</h3>
      {warns.length === 0 ? (
        <p className="fine">Por agora, nada de estranho.</p>
      ) : (
        <ul className="flag-list">
          {warns.map((flag) => (
            <li key={flag.id}>
              <Zap size={14} />
              <div>
                <strong>{flag.title}</strong>
                <p>{flag.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {know.length ? (
        <div className="bubble soft">
          <p className="fine">Quem sabe o quê</p>
          {know.map((edge) => (
            <p key={`${edge.knower}-${edge.secret}`}>
              <strong>{edge.knower}</strong> · {edge.secret}
            </p>
          ))}
        </div>
      ) : null}
      {book.bible.rules[0] ? (
        <div className="bubble soft">
          <p className="fine">Regra da bíblia</p>
          <p>{book.bible.rules[0]}</p>
        </div>
      ) : null}
    </div>
  );
}

export function MemoryPrompt({ book }: { book: Book }) {
  const store = useBooks();
  const chapter = book.chapters.find((item) => item.id === book.activeChapterId) ?? book.chapters[0];
  const bodySignature = chapter
    ? [chapter.body, ...chapter.scenes.map((scene) => scene.body)].join("\u0001")
    : "";
  const pending = book.memory.filter((m) => m.status === "pending");

  // Debounce: só extrai depois de parar de escrever (evita 1 cartão por tecla).
  useEffect(() => {
    if (!chapter) return;
    const timer = window.setTimeout(() => {
      store.refreshMemory(book.id, chapter.id);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [book.id, chapter?.id, bodySignature, store]);

  if (!pending.length) return null;

  const item = pending[0];
  const more = pending.length - 1;

  return (
    <div className="memory-prompt">
      <p className="eyebrow">Memória</p>
      <p className="memory-line">{item.text}</p>
      <div className="memory-actions">
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            const bible = {
              ...book.bible,
              truths: [...book.bible.truths, item.text],
            };
            store.patchBook(book.id, {
              bible,
              memory: book.memory.map((m) =>
                m.id === item.id ? { ...m, status: "accepted" as const } : m,
              ),
            });
          }}
        >
          À bíblia
        </button>
        <button
          type="button"
          className="text-btn"
          onClick={() =>
            store.patchBook(book.id, {
              memory: book.memory.map((m) =>
                m.id === item.id ? { ...m, status: "dismissed" as const } : m,
              ),
            })
          }
        >
          Ignorar
        </button>
        {more > 0 ? <span className="memory-more">+{more}</span> : null}
      </div>
    </div>
  );
}

export function HeatmapPanel({ book }: { book: Book }) {
  const rows = book.chapters.map((chapter, index) => {
    const score =
      typeof chapter.tension === "number" ? chapter.tension : chapterTension(chapter.body);
    return { chapter, index, score };
  });

  let dipNote = "";
  for (let i = 0; i < rows.length - 2; i += 1) {
    if (rows[i].score >= 7 && rows[i + 1].score <= 3 && rows[i + 2].score <= 4) {
      dipNote = `Há uma queda de tensão a partir do capítulo ${i + 1}.`;
      break;
    }
  }

  return (
    <div className="heatmap-panel">
      <p className="eyebrow">Heatmap</p>
      <h3>Tensão</h3>
      <ul className="heat-rows">
        {rows.map((row) => (
          <li key={row.chapter.id}>
            <span>Cap. {String(row.index + 1).padStart(2, "0")}</span>
            <span className="heat-bar" aria-label={`Tensão ${row.score} de 10`}>
              <i style={{ width: `${row.score * 10}%` }} />
            </span>
          </li>
        ))}
      </ul>
      {dipNote ? <p className="fine">{dipNote}</p> : <p className="fine">Ferramenta editorial — não decide o que é bom.</p>}
    </div>
  );
}

export function ReaderMode({
  book,
  onClose,
}: {
  book: Book;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="reader-mode" role="dialog" aria-label="Ler como leitor">
      <button type="button" className="reader-close" onClick={onClose}>
        ESC · Sair
      </button>
      <article className="reader-book">
        {book.chapters.map((chapter, index) => (
          <section key={chapter.id} className="reader-chapter">
            <p className="reader-num">{index + 1}</p>
            <h2>Capítulo {index + 1}</h2>
            <h3>{chapter.title || "Sem título"}</h3>
            {plainText(chapter.body)
              .split(/\n\n+/)
              .filter(Boolean)
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            {chapter.scenes.map((scene) => (
              <div key={scene.id} className="reader-scene">
                <h4>{scene.title}</h4>
                {plainText(scene.body)
                  .split(/\n\n+/)
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
              </div>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}

export function SessionBar({
  book,
  chapter,
}: {
  book: Book;
  chapter: Chapter;
}) {
  const store = useBooks();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [goalKind, setGoalKind] = useState<"15" | "30" | "words" | "custom">("words");
  const [wordGoal, setWordGoal] = useState(book.sessionTarget || 500);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [startWords, setStartWords] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState<{ words: number; minutes: number } | null>(null);

  const nowWords = plainText(chapter.body).split(/\s+/).filter(Boolean).length;
  const gained = Math.max(0, nowWords - startWords);
  const targetWords = goalKind === "words" || goalKind === "custom" ? wordGoal : 0;
  const targetMinutes = goalKind === "15" ? 15 : goalKind === "30" ? 30 : 0;

  useEffect(() => {
    if (!running || !startedAt) return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [running, startedAt]);

  function start() {
    setStartWords(nowWords);
    setStartedAt(Date.now());
    setElapsed(0);
    setSummary(null);
    setRunning(true);
    setOpen(false);
  }

  function stop() {
    if (!startedAt) return;
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    const words = gained;
    setRunning(false);
    setSummary({ words, minutes });
    const streak = words > 0 ? (book.writeStreak || 0) + 1 : book.writeStreak;
    store.patchBook(book.id, {
      writeStreak: streak,
      sessionLog: [
        {
          id: crypto.randomUUID(),
          at: Date.now(),
          words,
          minutes,
          chapterId: chapter.id,
          goal: targetWords || targetMinutes,
        },
        ...book.sessionLog,
      ].slice(0, 40),
    });
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="session-bar">
      {!running && !summary ? (
        <button type="button" className="text-btn" onClick={() => setOpen((v) => !v)}>
          Começar sessão
        </button>
      ) : null}
      {open ? (
        <div className="session-setup">
          <p className="eyebrow">Meta</p>
          {(
            [
              ["15", "15 min"],
              ["30", "30 min"],
              ["words", "500 palavras"],
              ["custom", "Personalizado"],
            ] as const
          ).map(([id, label]) => (
            <label key={id} className="session-opt">
              <input
                type="radio"
                name="session-goal"
                checked={goalKind === id}
                onChange={() => {
                  setGoalKind(id);
                  if (id === "words") setWordGoal(500);
                }}
              />
              {label}
            </label>
          ))}
          {goalKind === "custom" ? (
            <input
              type="number"
              min={50}
              value={wordGoal}
              onChange={(e) => setWordGoal(Number(e.target.value) || 100)}
            />
          ) : null}
          <button type="button" className="ghost-btn" onClick={start}>
            Iniciar
          </button>
        </div>
      ) : null}
      {running ? (
        <div className="session-live">
          <span>
            {targetWords ? `${gained} / ${targetWords} palavras` : `${gained} palavras`}
          </span>
          <span>
            Tempo: {mm}:{ss}
            {targetMinutes ? ` / ${targetMinutes}:00` : ""}
          </span>
          <button type="button" className="text-btn" onClick={stop}>
            Terminar
          </button>
        </div>
      ) : null}
      {summary ? (
        <div className="session-summary">
          <p>
            <Sparkles size={14} /> Boa sessão.
          </p>
          <p>
            +{summary.words} palavras · {summary.minutes} min
            {book.writeStreak ? ` · sequência ${book.writeStreak}` : ""}
          </p>
          <button type="button" className="text-btn" onClick={() => setSummary(null)}>
            Fechar
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function VersionHistory({
  book,
  chapter,
}: {
  book: Book;
  chapter: Chapter;
}) {
  const store = useBooks();
  const snaps = chapter.snapshots ?? [];

  const groups = useMemo(() => {
    const map = new Map<string, typeof snaps>();
    for (const snap of snaps) {
      const day = snap.at.includes(",") ? snap.at.split(",")[0]! : "Versões";
      const list = map.get(day) ?? [];
      list.push(snap);
      map.set(day, list);
    }
    return [...map.entries()];
  }, [snaps]);

  return (
    <div className="version-history">
      <p className="eyebrow">Histórico</p>
      {!snaps.length ? <p className="fine">Ainda sem versões guardadas neste capítulo.</p> : null}
      {groups.map(([day, list]) => (
        <div key={day}>
          <p className="version-day">{day}</p>
          <ul>
            {list.map((snap) => (
              <li key={snap.id}>
                <div>
                  <strong>{snap.label || snap.kind || "versão"}</strong>
                  <small>
                    {snap.at} · {snap.words} palavras
                  </small>
                </div>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => store.restoreSnapshot(book.id, chapter.id, snap.id)}
                >
                  Restaurar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button
        type="button"
        className="text-btn"
        onClick={() => store.snapshotChapter(book.id, chapter.id, "manual")}
      >
        Guardar versão agora
      </button>
    </div>
  );
}

export function AskTheBook({ book }: { book: Book }) {
  const [q, setQ] = useState("");
  const [a, setA] = useState<string | null>(null);

  return (
    <div className="ask-book">
      <p className="eyebrow">
        <BookOpen size={13} /> Perguntar ao livro
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setA(
            askTheBook(q, {
              chapters: book.chapters,
              people: book.research,
              timeline: book.timeline.map((t) => ({ ...t, linkedIds: t.linkedIds ?? [] })),
              bible: book.bible,
            }),
          );
        }}
      >
        <input
          value={q}
          placeholder="Quando foi a última vez que…?"
          onChange={(e) => setQ(e.target.value)}
          aria-label="Perguntar ao livro"
        />
        <button type="submit" className="ghost-btn">
          Perguntar
        </button>
      </form>
      {a ? <div className="bubble"><p style={{ whiteSpace: "pre-wrap" }}>{a}</p></div> : null}
      <div className="ask-chips">
        {[
          "Existe alguma inconsistência na história?",
          "Quais são os temas da bíblia?",
          "Em quais capítulos Lisboa aparece?",
        ].map((chip) => (
          <button
            key={chip}
            type="button"
            className="ask-chip"
            onClick={() => {
              setQ(chip);
              setA(
                askTheBook(chip, {
                  chapters: book.chapters,
                  people: book.research,
                  timeline: book.timeline.map((t) => ({ ...t, linkedIds: t.linkedIds ?? [] })),
                  bible: book.bible,
                }),
              );
            }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SuggestDiff({
  original,
  suggestion,
  onAccept,
  onReject,
  onRetry,
}: {
  original: string;
  suggestion: string;
  onAccept: () => void;
  onReject: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="suggest-diff">
      <div className="diff-col">
        <p className="eyebrow">Original</p>
        <p>{original}</p>
      </div>
      <div className="diff-col sug">
        <p className="eyebrow">Sugestão</p>
        <p>{suggestion}</p>
      </div>
      <div className="diff-actions">
        <button type="button" className="ghost-btn" onClick={onAccept}>
          Aceitar
        </button>
        <button type="button" className="text-btn" onClick={onReject}>
          Rejeitar
        </button>
        <button type="button" className="text-btn" onClick={onRetry}>
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const WORLD_KINDS: SheetKind[] = [
  "pessoa",
  "lugar",
  "evento",
  "objeto",
  "organizacao",
  "nota",
];

export function worldKindIcon(kind: SheetKind) {
  if (kind === "pessoa") return <Heart size={12} />;
  if (kind === "lugar") return <Link2 size={12} />;
  return null;
}

function roman(n: number) {
  const map: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let rest = n;
  let out = "";
  for (const [value, glyph] of map) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out || String(n);
}
