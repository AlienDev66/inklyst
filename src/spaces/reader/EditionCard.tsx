import type { ShelfEdition } from "@pagina/domain";
import { BookOpen, MoreVertical, Plus, ThumbsDown } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { editionGenre, formatParts } from "./catalog";

function pagesLabel(n: number) {
  return n === 1 ? "1 página" : `${n} páginas`;
}

export function EditionCard({
  work,
  index = 0,
  reduce,
  onOpen,
  onRead,
  onAddLibrary,
  onLessLike,
}: {
  work: ShelfEdition;
  index?: number;
  reduce?: boolean | null;
  onOpen: () => void;
  onRead: () => void;
  onAddLibrary: () => void;
  onLessLike: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hasArt = Boolean(work.coverImage) && !imgBroken;

  useEffect(() => {
    setImgBroken(false);
  }, [work.coverImage]);

  useEffect(() => {
    if (!menu) return;
    function close(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setMenu(false);
    }
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <div
      className="rd-cover-wrap"
      ref={wrapRef}
      style={reduce ? undefined : { animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
    >
      <button type="button" className="rd-cover" onClick={onOpen}>
        <span
          className={hasArt ? "rd-cover-plate has-art" : "rd-cover-plate"}
          style={{ "--hue": String(work.coverHue || 24) } as CSSProperties}
        >
          {hasArt ? (
            <img
              src={work.coverImage}
              alt=""
              draggable={false}
              onError={() => setImgBroken(true)}
            />
          ) : null}
          {/* Com foto: título fica por baixo — evita sobrepor texto já na capa (Studio). */}
          {!hasArt ? (
            <span className="rd-cover-meta">
              <strong>{work.title}</strong>
              <small>
                {work.penName || "Inklyst"}
                {work.visibility === "beta" ? " · beta" : ""}
              </small>
            </span>
          ) : null}
        </span>
        <span className="rd-cover-caption">
          <strong>{work.title}</strong>
          <small>
            {pagesLabel(work.pages.length || 1)}
            {" · "}
            {editionGenre(work)}
            {work.visibility === "beta" ? " · beta" : ""}
          </small>
        </span>
      </button>
      <button
        type="button"
        className="rd-cover-more"
        aria-label={`Opções de ${work.title}`}
        aria-expanded={menu}
        onClick={(event) => {
          event.stopPropagation();
          setMenu((value) => !value);
        }}
      >
        <MoreVertical size={16} />
      </button>
      {menu ? (
        <div className="rd-cover-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              onRead();
            }}
          >
            <BookOpen size={15} /> Ler
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              onAddLibrary();
            }}
          >
            <Plus size={15} /> Adicionar à biblioteca
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              onLessLike();
            }}
          >
            <ThumbsDown size={15} /> Menos isto
          </button>
          <p className="rd-cover-menu-meta">{formatParts(work)}</p>
        </div>
      ) : null}
    </div>
  );
}
