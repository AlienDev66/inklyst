export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDef<Row, Insert = Row, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        {
          id: string;
          display_name: string;
          created_at: string;
          onboarding_intent: "read" | "write" | "both" | null;
          preferred_space: "reader" | "studio" | null;
          handle: string | null;
          bio: string;
          is_public: boolean;
        },
        {
          id: string;
          display_name?: string;
          created_at?: string;
          onboarding_intent?: "read" | "write" | "both" | null;
          preferred_space?: "reader" | "studio" | null;
          handle?: string | null;
          bio?: string;
          is_public?: boolean;
        }
      >;
      reading_progress: TableDef<
        {
          user_id: string;
          edition_id: string;
          page: number;
          paragraph: number;
          status: "reading" | "want" | "finished";
          updated_at: string;
        },
        {
          user_id: string;
          edition_id: string;
          page?: number;
          paragraph?: number;
          status?: "reading" | "want" | "finished";
          updated_at?: string;
        }
      >;
      book_lists: TableDef<
        {
          id: string;
          owner_id: string;
          title: string;
          description: string;
          is_public: boolean;
          created_at: string;
        },
        {
          id?: string;
          owner_id: string;
          title: string;
          description?: string;
          is_public?: boolean;
          created_at?: string;
        }
      >;
      book_list_items: TableDef<
        {
          list_id: string;
          edition_id: string;
          position: number;
          note: string;
          created_at: string;
        },
        {
          list_id: string;
          edition_id: string;
          position?: number;
          note?: string;
          created_at?: string;
        }
      >;
      reviews: TableDef<
        {
          id: string;
          author_id: string;
          edition_id: string;
          rating: number;
          body: string;
          is_public: boolean;
          created_at: string;
        },
        {
          id?: string;
          author_id: string;
          edition_id: string;
          rating: number;
          body?: string;
          is_public?: boolean;
          created_at?: string;
        }
      >;
      writing_ideas: TableDef<
        {
          id: string;
          owner_id: string;
          body: string;
          source_edition_id: string | null;
          source_title: string;
          source_excerpt: string;
          created_at: string;
          transformed_manuscript_id: string | null;
        },
        {
          id?: string;
          owner_id: string;
          body: string;
          source_edition_id?: string | null;
          source_title?: string;
          source_excerpt?: string;
          created_at?: string;
          transformed_manuscript_id?: string | null;
        }
      >;
      paragraph_comments: TableDef<
        {
          id: string;
          edition_id: string;
          page: number;
          paragraph: number;
          author_id: string;
          body: string;
          created_at: string;
        },
        {
          id?: string;
          edition_id: string;
          page: number;
          paragraph: number;
          author_id: string;
          body: string;
          created_at?: string;
        }
      >;
      paragraph_reactions: TableDef<
        {
          edition_id: string;
          page: number;
          paragraph: number;
          user_id: string;
          reaction: string;
          created_at: string;
        },
        {
          edition_id: string;
          page: number;
          paragraph: number;
          user_id: string;
          reaction: string;
          created_at?: string;
        }
      >;
      follows: TableDef<
        { follower_id: string; followee_id: string; created_at: string },
        { follower_id: string; followee_id: string; created_at?: string }
      >;
      works: TableDef<
        {
          id: string;
          open_library_key: string | null;
          title: string;
          authors: string[];
          language: string;
          page_count: number | null;
          cover_url: string | null;
          created_at: string;
        },
        {
          id?: string;
          open_library_key?: string | null;
          title: string;
          authors?: string[];
          language?: string;
          page_count?: number | null;
          cover_url?: string | null;
          created_at?: string;
        }
      >;
      edition_files: TableDef<{
        id: string;
        work_id: string;
        licensee: string | null;
        storage_path: string | null;
      }>;
      manuscripts: TableDef<
        { id: string; owner_id: string; title: string; language: string; created_at: string },
        { id?: string; owner_id: string; title: string; language?: string; created_at?: string }
      >;
      chapters: TableDef<
        { id: string; manuscript_id: string; position: number; title: string; body: string },
        { id?: string; manuscript_id: string; position: number; title?: string; body?: string }
      >;
      chapter_translations: TableDef<
        {
          id: string;
          chapter_id: string;
          locale: string;
          body: string;
          status: "machine_draft" | "author_confirmed";
        },
        {
          id?: string;
          chapter_id: string;
          locale: string;
          body?: string;
          status?: "machine_draft" | "author_confirmed";
        }
      >;
      manuscript_extras: TableDef<
        { manuscript_id: string; payload: Json; updated_at: string },
        { manuscript_id: string; payload?: Json; updated_at?: string }
      >;
      edition_snapshots: TableDef<
        {
          id: string;
          work_id: string;
          manuscript_id: string | null;
          owner_id: string;
          visibility: "public" | "beta";
          beta_code: string;
          pages: Json;
          chapters: Json;
          published_at: string;
        },
        {
          id?: string;
          work_id: string;
          manuscript_id?: string | null;
          owner_id: string;
          visibility: "public" | "beta";
          beta_code: string;
          pages?: Json;
          chapters?: Json;
          published_at?: string;
        }
      >;
      reading_pairs: TableDef<
        {
          id: string;
          work_id: string;
          inviter_id: string;
          invitee_id: string | null;
          status: "pending" | "active" | "ended";
          invite_code: string;
          created_at: string;
        },
        {
          id?: string;
          work_id: string;
          inviter_id: string;
          invitee_id?: string | null;
          status?: "pending" | "active" | "ended";
          invite_code?: string;
          created_at?: string;
        }
      >;
      progress_marks: TableDef<
        {
          id: string;
          pair_id: string;
          user_id: string;
          page: number;
          source: "manual" | "photo";
          photo_path: string | null;
          recorded_at: string;
        },
        {
          id?: string;
          pair_id: string;
          user_id: string;
          page: number;
          source: "manual" | "photo";
          photo_path?: string | null;
          recorded_at?: string;
        }
      >;
      margin_notes: TableDef<
        {
          id: string;
          pair_id: string;
          author_id: string;
          anchor_page: number;
          body: string;
          created_at: string;
        },
        {
          id?: string;
          pair_id: string;
          author_id: string;
          anchor_page: number;
          body: string;
          created_at?: string;
        }
      >;
      xp_events: TableDef<{
        id: string;
        user_id: string;
        kind: string;
        amount: number;
        created_at: string;
      }>;
      process_posts: TableDef<
        {
          id: string;
          author_id: string;
          kind: "reading_check_in" | "writing_session";
          title: string;
          page: number | null;
          word_count: number | null;
          visibility: "pair" | "followers" | "public";
          created_at: string;
        },
        {
          id?: string;
          author_id: string;
          kind: "reading_check_in" | "writing_session";
          title: string;
          page?: number | null;
          word_count?: number | null;
          visibility?: "pair" | "followers" | "public";
          created_at?: string;
        }
      >;
      advisor_notes: TableDef<{
        id: string;
        chapter_id: string;
        kind: "question" | "gap" | "continuity" | "return";
        prompt: string;
        created_at: string;
      }>;
    };
    Views: {
      circle_ranks: {
        Row: { user_id: string; xp: number };
        Relationships: [];
      };
    };
    Functions: {
      can_read_margin: { Args: { p_note: string }; Returns: boolean };
      grant_xp: { Args: { p_kind: string }; Returns: Database["public"]["Tables"]["xp_events"]["Row"] };
      latest_page: { Args: { p_pair: string; p_user: string }; Returns: number };
      confirm_translation: {
        Args: { p_id: string };
        Returns: Database["public"]["Tables"]["chapter_translations"]["Row"];
      };
      unlock_edition: {
        Args: { p_code: string };
        Returns: Database["public"]["Tables"]["edition_snapshots"]["Row"];
      };
      join_pair: {
        Args: { p_code: string };
        Returns: Database["public"]["Tables"]["reading_pairs"]["Row"];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ManuscriptRow = Database["public"]["Tables"]["manuscripts"]["Row"];
export type ChapterRow = Database["public"]["Tables"]["chapters"]["Row"];
export type EditionSnapshotRow = Database["public"]["Tables"]["edition_snapshots"]["Row"];
export type ReadingPairRow = Database["public"]["Tables"]["reading_pairs"]["Row"];
export type MarginNoteRow = Database["public"]["Tables"]["margin_notes"]["Row"];
export type ProgressMarkRow = Database["public"]["Tables"]["progress_marks"]["Row"];
