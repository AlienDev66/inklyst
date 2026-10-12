import { grantXp, insertProcessPost } from "@pagina/supabase";
import { isSupabaseConfigured, supabase } from "../../../lib/supabase";

export async function shareWritingProcess(input: {
  authorId: string;
  title: string;
  wordCount: number;
}) {
  if (!isSupabaseConfigured) {
    return { error: "Supabase não configurado." };
  }
  const post = await insertProcessPost(supabase, {
    authorId: input.authorId,
    kind: "writing_session",
    title: input.title,
    wordCount: input.wordCount,
    visibility: "followers",
  });
  if (post.error) return { error: post.error };
  const xp = await grantXp(supabase, "shared_process");
  if (xp.error) return { error: xp.error };
  return { error: null as string | null };
}
