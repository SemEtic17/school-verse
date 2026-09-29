/**
 * Database types for the SchoolVerse Supabase project.
 *
 * Shape matches `supabase gen types typescript`, so it can be regenerated with:
 *   supabase gen types typescript --linked > src/integrations/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string;
          description: string | null;
          event_date: string;
          id: string;
          image_url: string | null;
          location: string | null;
          planning_summary: string | null;
          status: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          event_date: string;
          id?: string;
          image_url?: string | null;
          location?: string | null;
          planning_summary?: string | null;
          status?: string;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          event_date?: string;
          id?: string;
          image_url?: string | null;
          location?: string | null;
          planning_summary?: string | null;
          status?: string;
          title?: string;
        };
        Relationships: [];
      };
      event_rsvps: {
        Row: {
          created_at: string;
          event_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      idea_upvotes: {
        Row: {
          created_at: string;
          id: string;
          idea_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          idea_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          idea_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_upvotes_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_upvotes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ideas: {
        Row: {
          author_id: string | null;
          category: string;
          created_at: string;
          description: string;
          id: string;
          title: string;
          upvotes_count: number;
        };
        Insert: {
          author_id?: string | null;
          category: string;
          created_at?: string;
          description: string;
          id?: string;
          title: string;
          upvotes_count?: number;
        };
        Update: {
          author_id?: string | null;
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          title?: string;
          upvotes_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ideas_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      memories: {
        Row: {
          category: string;
          created_at: string;
          event_date: string | null;
          id: string;
          image_url: string;
          title: string;
          uploader_id: string | null;
        };
        Insert: {
          category: string;
          created_at?: string;
          event_date?: string | null;
          id?: string;
          image_url: string;
          title: string;
          uploader_id?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          event_date?: string | null;
          id?: string;
          image_url?: string;
          title?: string;
          uploader_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "memories_uploader_id_fkey";
            columns: ["uploader_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      poll_options: {
        Row: {
          id: string;
          image_url: string | null;
          option_text: string;
          poll_id: string;
          votes_count: number;
        };
        Insert: {
          id?: string;
          image_url?: string | null;
          option_text: string;
          poll_id: string;
          votes_count?: number;
        };
        Update: {
          id?: string;
          image_url?: string | null;
          option_text?: string;
          poll_id?: string;
          votes_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
        ];
      };
      poll_suggestions: {
        Row: {
          created_at: string;
          id: string;
          poll_id: string;
          suggestion: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          poll_id: string;
          suggestion: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          poll_id?: string;
          suggestion?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poll_suggestions_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poll_suggestions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      poll_suggestion_upvotes: {
        Row: {
          created_at: string;
          suggestion_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          suggestion_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          suggestion_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      poll_votes: {
        Row: {
          created_at: string;
          id: string;
          option_id: string;
          poll_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          option_id: string;
          poll_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          option_id?: string;
          poll_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey";
            columns: ["option_id"];
            isOneToOne: false;
            referencedRelation: "poll_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      polls: {
        Row: {
          category: string;
          closes_at: string | null;
          created_at: string;
          id: string;
          question: string;
          title: string;
        };
        Insert: {
          category?: string;
          closes_at?: string | null;
          created_at?: string;
          id?: string;
          question: string;
          title: string;
        };
        Update: {
          category?: string;
          closes_at?: string | null;
          created_at?: string;
          id?: string;
          question?: string;
          title?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          class_section: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          role: string;
          student_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          class_section?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          role?: string;
          student_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          class_section?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          role?: string;
          student_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      set_profile_role: {
        Args: { target_profile_id: string; new_role: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
