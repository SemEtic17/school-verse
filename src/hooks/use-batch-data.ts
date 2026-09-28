import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  BatchEvent,
  Idea,
  Memory,
  Poll,
  PollOption,
  PollSuggestion,
} from "@/data/batch";
import { useAuth } from "./use-auth";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type PollRow = Database["public"]["Tables"]["polls"]["Row"];
type PollOptionRow = Database["public"]["Tables"]["poll_options"]["Row"];
type SuggestionRow = Database["public"]["Tables"]["poll_suggestions"]["Row"];
type IdeaRow = Database["public"]["Tables"]["ideas"]["Row"];
type MemoryRow = Database["public"]["Tables"]["memories"]["Row"];

type IdeaWithAuthor = IdeaRow & { author: { full_name: string | null } | null };
type SuggestionWithAuthor = Pick<
  SuggestionRow,
  "id" | "poll_id" | "suggestion"
> & {
  author: { full_name: string | null } | null;
};

export const queryKeys = {
  events: ["events"] as const,
  polls: ["polls"] as const,
  ideas: ["ideas"] as const,
  memories: ["memories"] as const,
  myVotes: (userId: string | null) => ["poll-votes", "mine", userId] as const,
  myUpvotes: (userId: string | null) =>
    ["idea-upvotes", "mine", userId] as const,
};

// --- adapters --------------------------------------------------------------

function closesInLabel(closesAt: string | null): string | undefined {
  if (!closesAt) return undefined;
  const ms = new Date(closesAt).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const hours = Math.floor(ms / 3_600_000);
  return hours < 24
    ? `closes ${hours}h`
    : `closes in ${Math.floor(hours / 24)}d`;
}

function toEvent(row: EventRow): BatchEvent {
  return {
    id: row.id,
    name: row.title,
    date: row.event_date,
    location: row.location ?? undefined,
    description: row.description ?? undefined,
    planning: row.planning_summary ?? undefined,
    image: row.image_url ?? undefined,
    past:
      row.status === "past" || new Date(row.event_date).getTime() < Date.now(),
  };
}

function toOption(row: PollOptionRow): PollOption {
  return {
    id: row.id,
    label: row.option_text,
    votes: row.votes_count,
    image: row.image_url ?? undefined,
  };
}

function toMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    caption: row.title,
    event: row.category,
    dateISO: row.event_date,
    date: row.event_date
      ? new Date(row.event_date).toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        })
      : new Date(row.created_at).toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        }),
    image: row.image_url,
  };
}

// --- queries ---------------------------------------------------------------

export function useEvents() {
  return useQuery({
    queryKey: queryKeys.events,
    queryFn: async (): Promise<BatchEvent[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(toEvent);
    },
  });
}

export function usePolls() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: [...queryKeys.polls, userId],
    queryFn: async (): Promise<Poll[]> => {
      const [pollsRes, optionsRes, suggestionsRes] = await Promise.all([
        supabase
          .from("polls")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("poll_options")
          .select("*")
          .order("votes_count", { ascending: false }),
        supabase
          .from("poll_suggestions")
          .select("id, poll_id, suggestion, author:profiles(full_name)")
          .order("created_at", { ascending: true }),
      ]);
      if (pollsRes.error) throw pollsRes.error;
      if (optionsRes.error) throw optionsRes.error;
      if (suggestionsRes.error) throw suggestionsRes.error;

      const myVotes = new Map<string, string>();
      if (userId) {
        const { data, error } = await supabase
          .from("poll_votes")
          .select("poll_id, option_id")
          .eq("user_id", userId);
        if (error) throw error;
        for (const vote of data ?? [])
          myVotes.set(vote.poll_id, vote.option_id);
      }

      const optionsByPoll = new Map<string, PollOption[]>();
      for (const row of (optionsRes.data ?? []) as PollOptionRow[]) {
        const list = optionsByPoll.get(row.poll_id) ?? [];
        list.push(toOption(row));
        optionsByPoll.set(row.poll_id, list);
      }

      const suggestionsByPoll = new Map<string, PollSuggestion[]>();
      for (const row of (suggestionsRes.data ?? []) as SuggestionWithAuthor[]) {
        const list = suggestionsByPoll.get(row.poll_id) ?? [];
        list.push({
          id: row.id,
          author: row.author?.full_name ?? "Anonymous",
          text: row.suggestion,
        });
        suggestionsByPoll.set(row.poll_id, list);
      }

      return ((pollsRes.data ?? []) as PollRow[]).map((poll) => ({
        id: poll.id,
        title: poll.title,
        question: poll.question,
        category: poll.category,
        closesIn: closesInLabel(poll.closes_at),
        closesAt: poll.closes_at,
        options: optionsByPoll.get(poll.id) ?? [],
        suggestions: suggestionsByPoll.get(poll.id) ?? [],
        myOptionId: myVotes.get(poll.id),
      }));
    },
  });
}

export function useIdeas() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: [...queryKeys.ideas, userId],
    queryFn: async (): Promise<Idea[]> => {
      const { data, error } = await supabase
        .from("ideas")
        .select("*, author:profiles(full_name)")
        .order("upvotes_count", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      let upvoted = new Set<string>();
      if (userId) {
        const { data: votes, error: votesError } = await supabase
          .from("idea_upvotes")
          .select("idea_id")
          .eq("user_id", userId);
        if (votesError) throw votesError;
        upvoted = new Set((votes ?? []).map((v) => v.idea_id));
      }

      return ((data ?? []) as IdeaWithAuthor[]).map((row) => ({
        id: row.id,
        title: row.title,
        body: row.description,
        category: row.category,
        author: row.author?.full_name ?? "Anonymous",
        agree: row.upvotes_count,
        upvoted: upvoted.has(row.id),
      }));
    },
  });
}

export function useMemories() {
  return useQuery({
    queryKey: queryKeys.memories,
    queryFn: async (): Promise<Memory[]> => {
      const { data, error } = await supabase
        .from("memories")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as MemoryRow[]).map(toMemory);
    },
  });
}

/** Polls that drive the "senior clothes" gallery. */
export function useClothingPolls() {
  const query = usePolls();
  return {
    ...query,
    data: query.data?.filter((poll) => poll.category === "clothing") ?? [],
  };
}

// --- mutations -------------------------------------------------------------

export function useCastVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      pollId,
      optionId,
    }: {
      pollId: string;
      optionId: string;
    }) => {
      if (!user) throw new Error("Sign in to vote.");
      const { error } = await supabase
        .from("poll_votes")
        .upsert(
          { poll_id: pollId, option_id: optionId, user_id: user.id },
          { onConflict: "poll_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.polls }),
  });
}

export function useAddSuggestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ pollId, text }: { pollId: string; text: string }) => {
      if (!user) throw new Error("Sign in to suggest.");
      const { error } = await supabase
        .from("poll_suggestions")
        .insert({ poll_id: pollId, user_id: user.id, suggestion: text });
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.polls }),
  });
}

export function useCreateIdea() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      category: string;
    }) => {
      if (!user) throw new Error("Sign in to post an idea.");
      const { error } = await supabase.from("ideas").insert({
        title: input.title,
        description: input.description,
        category: input.category,
        author_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas }),
  });
}

export function useToggleIdeaUpvote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      ideaId,
      upvoted,
    }: {
      ideaId: string;
      upvoted: boolean;
    }) => {
      if (!user) throw new Error("Sign in to upvote.");
      if (upvoted) {
        const { error } = await supabase
          .from("idea_upvotes")
          .delete()
          .eq("idea_id", ideaId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("idea_upvotes")
          .insert({ idea_id: ideaId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas }),
  });
}
