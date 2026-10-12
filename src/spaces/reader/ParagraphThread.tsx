import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import {
  addLocalParaComment,
  listLocalParaComments,
  listLocalReactions,
  setLocalReaction,
} from "./libraryLocal";

const REACTIONS = ["🔥", "💔", "😮", "😂", "🫶"];

type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: number;
};

export function ParagraphSheet({
  open,
  onClose,
  editionId,
  page,
  paragraph,
  excerpt,
  authorName,
  userId,
  cloud,
  onCountsChange,
}: {
  open: boolean;
  onClose: () => void;
  editionId: string;
  page: number;
  paragraph: number;
  excerpt: string;
  authorName: string;
  userId: string | null;
  cloud: boolean;
  onCountsChange: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const local = listLocalParaComments(editionId, page)
      .filter((item) => item.paragraph === paragraph)
      .map((item) => ({
        id: item.id,
        author: item.author,
        body: item.body,
        createdAt: item.createdAt,
      }));
    setComments(local);
    setReactions(
      listLocalReactions(editionId, page)
        .filter((item) => item.paragraph === paragraph)
        .map((item) => item.reaction),
    );

    if (!cloud || !isSupabaseConfigured) return;
    let cancelled = false;
    void import("@pagina/supabase").then(async ({ listParagraphComments, listParagraphReactions }) => {
      const remote = await listParagraphComments(supabase, editionId, page);
      const remoteReactions = await listParagraphReactions(supabase, editionId, page);
      if (cancelled) return;
      const merged = [
        ...local,
        ...remote
          .filter((row) => row.paragraph === paragraph)
          .map((row) => ({
            id: row.id,
            author: row.author_id.slice(0, 8),
            body: row.body,
            createdAt: new Date(row.created_at).getTime(),
          })),
      ];
      const seen = new Set<string>();
      setComments(
        merged.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        }),
      );
      setReactions(
        remoteReactions
          .filter((row) => row.paragraph === paragraph)
          .map((row) => row.reaction),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [open, editionId, page, paragraph, cloud]);

  if (!open) return null;

  return (
    <div className="para-sheet-scrim" role="dialog" aria-modal onClick={onClose}>
      <div className="para-sheet" onClick={(event) => event.stopPropagation()}>
        <header className="para-sheet-head">
          <button type="button" className="icon-btn tiny" aria-label="Fechar" onClick={onClose}>
            <X size={16} />
          </button>
          <strong>Parágrafo {paragraph + 1}</strong>
          <span />
        </header>
        <p className="para-sheet-quote">«{excerpt}»</p>
        <div className="para-reacts" aria-label="Reagir">
          {REACTIONS.map((reaction) => (
            <button
              key={reaction}
              type="button"
              className="para-react"
              onClick={() => {
                setLocalReaction({
                  editionId,
                  page,
                  paragraph,
                  reaction,
                  userId: userId || authorName,
                });
                setReactions((list) => (list.includes(reaction) ? list : [...list, reaction]));
                onCountsChange();
                if (cloud && userId) {
                  void import("@pagina/supabase").then(({ upsertParagraphReaction }) =>
                    upsertParagraphReaction(supabase, {
                      editionId,
                      page,
                      paragraph,
                      userId,
                      reaction,
                    }),
                  );
                }
              }}
            >
              {reaction}
            </button>
          ))}
        </div>
        {reactions.length ? (
          <p className="fine para-react-sum">{reactions.join(" ")}</p>
        ) : null}
        <form
          className="para-composer"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.trim()) return;
            const body = draft.trim();
            const comment = addLocalParaComment({
              editionId,
              page,
              paragraph,
              author: authorName,
              body,
            });
            setComments((list) => [
              ...list,
              {
                id: comment.id,
                author: comment.author,
                body: comment.body,
                createdAt: comment.createdAt,
              },
            ]);
            setDraft("");
            onCountsChange();
            if (cloud && userId) {
              void import("@pagina/supabase").then(({ insertParagraphComment }) =>
                insertParagraphComment(supabase, {
                  editionId,
                  page,
                  paragraph,
                  authorId: userId,
                  body,
                }),
              );
            }
          }}
        >
          <input
            value={draft}
            placeholder="Escreve um comentário…"
            aria-label="Comentário ao parágrafo"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" aria-label="Enviar">
            <Send size={15} />
          </button>
        </form>
        <div className="para-comments">
          {comments.length === 0 ? (
            <p className="para-empty">
              <MessageCircle size={18} /> Sê o primeiro a comentar
            </p>
          ) : (
            comments.map((comment) => (
              <article key={comment.id} className="para-comment">
                <strong>{comment.author}</strong>
                <p>{comment.body}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
