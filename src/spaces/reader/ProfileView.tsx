import type { ShelfEdition } from "@pagina/domain";
import { BookOpen, List, Pencil, Users } from "lucide-react";
import { useState, type CSSProperties, type FormEvent } from "react";
import { editionGenre, formatParts } from "./catalog";
import type { LocalList, LocalReview } from "./libraryLocal";
import { isSampleEdition } from "./sampleBooks";

type ProfileTab = "sobre" | "obras" | "listas" | "circulo";

export function ProfileView({
  greetName,
  profileHandle,
  profileBio,
  onHandleChange,
  onBioChange,
  onSave,
  editions,
  lists,
  reviews,
  circle,
  listTitle,
  onListTitleChange,
  onCreateList,
  cloud,
  userId,
  followId,
  followBusy,
  followError,
  onFollowIdChange,
  onFollow,
  onOpenEdition,
}: {
  greetName: string;
  profileHandle: string;
  profileBio: string;
  onHandleChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onSave: () => void;
  editions: ShelfEdition[];
  lists: LocalList[];
  reviews: LocalReview[];
  circle: { userId: string; xp: number }[];
  listTitle: string;
  onListTitleChange: (value: string) => void;
  onCreateList: (event: FormEvent) => void;
  cloud: boolean;
  userId: string | null;
  followId: string;
  followBusy: boolean;
  followError: string | null;
  onFollowIdChange: (value: string) => void;
  onFollow: (event: FormEvent) => void;
  onOpenEdition: (id: string) => void;
}) {
  const [tab, setTab] = useState<ProfileTab>("sobre");
  const [editing, setEditing] = useState(false);

  const published = editions.filter((item) => !isSampleEdition(item.id) || item.visibility === "public");
  const works = published.length ? published : editions;
  const draftCount = editions.filter((item) => item.visibility === "beta").length;

  return (
    <section className="rd-profile" aria-label="Perfil">
      <div className="rd-profile-banner">
        <span className="rd-profile-avatar">{greetName.slice(0, 1).toUpperCase()}</span>
        <h2>{greetName}</h2>
        <p>@{profileHandle || "sem-handle"}</p>
        <div className="rd-profile-stats">
          <span>
            <strong>{works.length}</strong>
            Obras
          </span>
          <span>
            <strong>{lists.length}</strong>
            Listas
          </span>
          <span>
            <strong>{circle.length}</strong>
            Círculo
          </span>
        </div>
      </div>

      <div className="rd-profile-bar">
        <nav className="rd-profile-tabs" aria-label="Secções do perfil">
          {(
            [
              ["sobre", "Sobre"],
              ["obras", "Obras"],
              ["listas", "Listas"],
              ["circulo", "Círculo"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "on" : undefined}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="rd-btn ghost tiny"
          onClick={() => {
            setTab("sobre");
            setEditing((value) => !value);
          }}
        >
          <Pencil size={14} />
          {editing ? "Ver perfil" : "Editar"}
        </button>
      </div>

      {tab === "sobre" ? (
        <div className="rd-profile-grid">
          <aside className="rd-profile-aside">
            {editing ? (
              <>
                <label className="rd-field">
                  <span>Handle</span>
                  <input
                    value={profileHandle}
                    placeholder="ex.: domingos"
                    onChange={(event) => onHandleChange(event.target.value)}
                  />
                </label>
                <label className="rd-field">
                  <span>Bio</span>
                  <textarea
                    value={profileBio}
                    placeholder="Ajuda as pessoas a conhecer-te"
                    rows={4}
                    onChange={(event) => onBioChange(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="rd-btn primary"
                  onClick={() => {
                    onSave();
                    setEditing(false);
                  }}
                >
                  Guardar perfil
                </button>
              </>
            ) : (
              <>
                <p className="eyebrow">Sobre</p>
                {profileBio.trim() ? (
                  <p className="rd-profile-bio">{profileBio}</p>
                ) : (
                  <div className="rd-profile-empty">
                    <p>Ajuda as pessoas a conhecer-te.</p>
                    <button type="button" className="rd-btn primary" onClick={() => setEditing(true)}>
                      Adicionar descrição
                    </button>
                  </div>
                )}
                <p className="fine" style={{ marginTop: 16 }}>
                  {cloud && userId ? "Conta ligada · perfil público" : "Perfil neste browser"}
                </p>
              </>
            )}
          </aside>

          <div className="rd-profile-main">
            <p className="eyebrow">Histórias</p>
            <h3>
              Por {greetName}
              <small>
                {" "}
                · {works.length} {works.length === 1 ? "obra" : "obras"}
                {draftCount ? ` · ${draftCount} beta` : ""}
              </small>
            </h3>
            <div className="rd-profile-works">
              {works.slice(0, 4).map((work) => (
                <WorkCard key={work.id} work={work} onOpen={() => onOpenEdition(work.id)} />
              ))}
              {!works.length ? (
                <p className="fine">Ainda não há obras neste perfil. Publica no Studio.</p>
              ) : null}
            </div>
            {reviews.length ? (
              <div style={{ marginTop: 22 }}>
                <p className="eyebrow">Reviews</p>
                <ul className="rd-simple-list">
                  {reviews.slice(0, 5).map((review) => {
                    const book = editions.find((item) => item.id === review.editionId);
                    return (
                      <li key={review.id}>
                        <span>
                          <strong>
                            {"★".repeat(review.rating)}
                            {book ? ` · ${book.title}` : ""}
                          </strong>
                          <br />
                          <span className="fine">{review.body || "Sem texto"}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "obras" ? (
        <div className="rd-profile-main full">
          <p className="eyebrow">Todas as obras</p>
          <h3>
            {works.length} {works.length === 1 ? "história" : "histórias"}
          </h3>
          <div className="rd-profile-works">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} onOpen={() => onOpenEdition(work.id)} />
            ))}
          </div>
        </div>
      ) : null}

      {tab === "listas" ? (
        <div className="rd-profile-main full">
          <p className="eyebrow">Listas de leitura</p>
          <h3>As tuas prateleiras</h3>
          <form className="rd-invite compact" onSubmit={onCreateList}>
            <input
              value={listTitle}
              placeholder="Nova lista"
              onChange={(event) => onListTitleChange(event.target.value)}
            />
            <button type="submit">Criar</button>
          </form>
          <ul className="rd-profile-lists">
            {lists.map((list) => (
              <li key={list.id}>
                <List size={16} />
                <div>
                  <strong>{list.title}</strong>
                  <small>
                    {list.editionIds.length}{" "}
                    {list.editionIds.length === 1 ? "livro" : "livros"}
                    {list.description ? ` · ${list.description}` : ""}
                  </small>
                </div>
              </li>
            ))}
            {!lists.length ? (
              <li className="fine">Cria uma lista — «Quero ler», favoritos, o que quiseres.</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {tab === "circulo" ? (
        <div className="rd-profile-main full">
          <p className="eyebrow">Círculo</p>
          <h3>Quem lê perto de ti</h3>
          <ol className="rd-circle">
            {circle.map((entry) => (
              <li key={entry.userId}>
                <span className="rd-avatar">{entry.userId.slice(0, 1)}</span>
                <span>{entry.userId}</span>
                <span className="xp">{entry.xp}</span>
              </li>
            ))}
          </ol>
          {cloud && userId ? (
            <form className="follow-row" onSubmit={onFollow}>
              <input
                value={followId}
                placeholder="ID ou nome exacto"
                aria-label="Seguir utilizador"
                onChange={(event) => onFollowIdChange(event.target.value)}
              />
              <button type="submit" disabled={followBusy}>
                <Users size={14} /> Seguir
              </button>
            </form>
          ) : (
            <p className="fine">Entra com conta para seguir pessoas.</p>
          )}
          {followError ? <p className="fine" style={{ marginTop: 8 }}>{followError}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function WorkCard({ work, onOpen }: { work: ShelfEdition; onOpen: () => void }) {
  return (
    <button type="button" className="rd-work-card" onClick={onOpen}>
      <span
        className="rd-work-cover"
        style={
          {
            "--hue": String(work.coverHue || 24),
            backgroundImage: work.coverImage ? `url(${work.coverImage})` : undefined,
          } as CSSProperties
        }
      />
      <span className="rd-work-copy">
        <strong>{work.title}</strong>
        <span className="rd-work-meta">
          <BookOpen size={12} /> {formatParts(work)}
          {" · "}
          {editionGenre(work)}
          {work.visibility === "beta" ? " · BETA" : ""}
          {work.complete ? " · Concluído" : ""}
        </span>
        <em>{work.pitch.slice(0, 120)}{work.pitch.length > 120 ? "…" : ""}</em>
        {(work.tags?.length ?? 0) > 0 ? (
          <span className="rd-work-tags">
            {work.tags!.slice(0, 3).map((tag) => (
              <i key={tag}>{tag}</i>
            ))}
          </span>
        ) : null}
      </span>
    </button>
  );
}
