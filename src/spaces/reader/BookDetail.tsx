import type { ShelfEdition } from "@pagina/domain";
import { ArrowLeft, BookOpen, List, Plus } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { alsoLike, editionGenre, formatParts } from "./catalog";

export function BookDetail({
  edition,
  catalog,
  onBack,
  onStart,
  onOpenRelated,
  onWant,
  progressLabel,
}: {
  edition: ShelfEdition;
  catalog: ShelfEdition[];
  onBack: () => void;
  onStart: () => void;
  onOpenRelated: (id: string) => void;
  onWant: () => void;
  progressLabel: string | null;
}) {
  const [tab, setTab] = useState<"summary" | "parts">("summary");
  const related = alsoLike(catalog, edition);
  const date = new Date(edition.publishedAt).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bk-detail">
      <header className="bk-detail-top">
        <button type="button" className="rd-nav-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Voltar
        </button>
      </header>

      <section className="bk-hero">
        <div
          className="bk-cover"
          style={
            {
              "--hue": String(edition.coverHue || 24),
              backgroundImage: edition.coverImage ? `url(${edition.coverImage})` : undefined,
            } as CSSProperties
          }
          aria-hidden
        />
        <div className="bk-hero-copy">
          <p className="eyebrow">{editionGenre(edition)}</p>
          <h1>{edition.title}</h1>
          <p className="bk-author">{edition.penName || "Inklyst"}</p>
          <p className="bk-meta">
            {edition.complete ? "Concluído" : "Em curso"}
            {" · "}
            {date}
            {" · "}
            {formatParts(edition)}
            {edition.visibility === "beta" ? " · beta" : ""}
          </p>
          <div className="bk-actions">
            <button type="button" className="rd-btn primary" onClick={onStart}>
              <BookOpen size={16} />
              {progressLabel ? "Continuar a ler" : "Começar a ler"}
            </button>
            <button type="button" className="rd-btn ghost" onClick={onWant} aria-label="Quero ler">
              <Plus size={16} />
            </button>
          </div>
          {progressLabel ? <p className="fine">Retomas em {progressLabel}</p> : null}
        </div>
      </section>

      <nav className="bk-tabs" aria-label="Sobre a história">
        <button
          type="button"
          className={tab === "summary" ? "on" : undefined}
          onClick={() => setTab("summary")}
        >
          Resumo
        </button>
        <button
          type="button"
          className={tab === "parts" ? "on" : undefined}
          onClick={() => setTab("parts")}
        >
          Partes
        </button>
      </nav>

      {tab === "summary" ? (
        <section className="bk-panel">
          <p className="bk-pitch">{edition.pitch || "Sem descrição ainda."}</p>
          {(edition.tags?.length ?? 0) > 0 ? (
            <div className="bk-tags">
              <span className="eyebrow">Tags</span>
              <div className="bk-tag-row">
                {edition.tags!.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="bk-panel">
          <ol className="bk-parts">
            {(edition.chapters?.length ? edition.chapters : [{ id: "p", title: "Texto", body: "" }]).map(
              (chapter, index) => (
                <li key={chapter.id}>
                  <List size={14} />
                  <span>
                    <strong>
                      {index + 1}. {chapter.title || "Sem título"}
                    </strong>
                  </span>
                </li>
              ),
            )}
          </ol>
          <button type="button" className="rd-btn primary" style={{ marginTop: 16 }} onClick={onStart}>
            Abrir a ler
          </button>
        </section>
      )}

      {related.length ? (
        <section className="bk-also">
          <h2>Também podes gostar</h2>
          <div className="bk-also-rail">
            {related.map((item) => (
              <button
                key={item.id}
                type="button"
                className="bk-also-card"
                onClick={() => onOpenRelated(item.id)}
              >
                <span
                  className="bk-also-cover"
                  style={
                    {
                      "--hue": String(item.coverHue || 24),
                      backgroundImage: item.coverImage ? `url(${item.coverImage})` : undefined,
                    } as CSSProperties
                  }
                />
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {formatParts(item)}
                    {item.complete ? " · Concluído" : ""}
                  </small>
                  <em>{item.pitch.slice(0, 90)}{item.pitch.length > 90 ? "…" : ""}</em>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
