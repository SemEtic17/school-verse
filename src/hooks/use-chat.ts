import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type ChatGif = {
  id: string;
  name: string;
  url: string;
  storagePath: string;
};

/** The message a reply quotes, trimmed down to what the chat bubble shows. */
export type ChatReply = {
  id: string;
  body: string;
  senderName: string | null;
  gifUrl: string | null;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string | null;
  senderAvatar: string | null;
  gif: ChatGif | null;
  replyTo: ChatReply | null;
};

export const chatKeys = {
  messages: ["chat-messages"] as const,
  gifs: ["chat-gifs"] as const,
};

const gifBucket = "chat-gifs";
const maxGifSize = 10 * 1024 * 1024;
const gifTypes = ["image/gif", "video/mp4", "video/webm"];

/** Short videos loop inline like GIFs (much lighter than .gif files). */
export function isVideoUrl(url: string) {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

const messageSelect = `
  id,
  body,
  created_at,
  sender_id,
  reply_to_id,
  sender:profiles (full_name, avatar_url),
  gif:chat_gifs (id, url, name)
`;

/**
 * Used before the replies migration lands, when `reply_to_id` doesn't exist yet.
 */
const messageSelectWithoutReplies = `
  id,
  body,
  created_at,
  sender_id,
  sender:profiles (full_name, avatar_url),
  gif:chat_gifs (id, url, name)
`;

/**
 * Quoted messages are fetched in a second, plain query and joined by id on the
 * client. PostgREST can't safely embed the self-referencing `chat_messages` row
 * here: a self join exposes both a to-one and a to-many relationship for the
 * same foreign key, and naming the table as the embed target resolves to the
 * wrong (to-many) side. That returned an array for every message, so replies
 * rendered as blank "Batch member / Message" quotes on every bubble.
 */
type ReplyTargetRow = {
  id: string;
  body: string;
  sender: { full_name: string | null } | null;
  gif: { url: string } | null;
};

type MessageRow = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
  sender: { full_name: string | null; avatar_url: string | null } | null;
  gif: { id: string; url: string; name: string } | null;
  // Absent from the fallback select used before the replies migration lands.
  reply_to_id?: string | null;
};

type GifRow = {
  id: string;
  name: string;
  url: string;
  storage_path: string;
};

function toMessage(
  row: MessageRow,
  replies: Map<string, ChatReply> = new Map(),
): ChatMessage {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    senderId: row.sender_id,
    senderName: row.sender?.full_name ?? null,
    senderAvatar: row.sender?.avatar_url ?? null,
    gif: row.gif
      ? {
          id: row.gif.id,
          name: row.gif.name,
          url: row.gif.url,
          storagePath: "",
        }
      : null,
    replyTo: row.reply_to_id ? (replies.get(row.reply_to_id) ?? null) : null,
  };
}

/** Fetch the quoted parents for a batch of messages and index them by id. */
async function fetchReplies(
  rows: MessageRow[],
): Promise<Map<string, ChatReply>> {
  const ids = [
    ...new Set(
      rows
        .map((row) => row.reply_to_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const replies = new Map<string, ChatReply>();
  if (ids.length === 0) return replies;

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, body, sender:profiles (full_name), gif:chat_gifs (url)")
    .in("id", ids);
  if (error) throw error;

  for (const row of (data ?? []) as unknown as ReplyTargetRow[]) {
    replies.set(row.id, {
      id: row.id,
      body: row.body,
      senderName: row.sender?.full_name ?? null,
      gifUrl: row.gif?.url ?? null,
    });
  }
  return replies;
}

/** Postgres code for "column does not exist". */
function isMissingReplyColumn(error: { code?: string } | null) {
  return error?.code === "42703";
}

/**
 * Whether the database has the `reply_to_id` column, cached for the session.
 *
 * Selecting the column on its own is the reliable probe: asking for the reply
 * join before the migration is applied fails with a relationship error
 * (PGRST200) rather than a column error, which is harder to tell apart from a
 * genuine mistake.
 */
let replySupport: boolean | null = null;

async function hasReplySupport() {
  if (replySupport !== null) return replySupport;
  const { error } = await supabase
    .from("chat_messages")
    .select("reply_to_id")
    .limit(1);
  replySupport = !isMissingReplyColumn(error);
  return replySupport;
}

async function selectRows(select: string, messageId: string | null) {
  const base = supabase.from("chat_messages").select(select);
  const { data, error } = messageId
    ? await base.eq("id", messageId).maybeSingle()
    : await base.order("created_at", { ascending: false }).limit(200);
  return {
    data: (data ?? null) as unknown as MessageRow[] | MessageRow | null,
    error,
  };
}

/**
 * Load messages plus the quoted parents for whichever messages are replies,
 * falling back to plain messages on a database that has not run the replies
 * migration yet.
 */
async function fetchRows(messageId: string | null) {
  const select = (await hasReplySupport())
    ? messageSelect
    : messageSelectWithoutReplies;
  const { data, error } = await selectRows(select, messageId);
  if (error) throw error;
  if (!data)
    return { rows: [] as MessageRow[], replies: new Map<string, ChatReply>() };
  const rows = Array.isArray(data) ? data : [data];
  return { rows, replies: await fetchReplies(rows) };
}

function toGif(row: GifRow): ChatGif {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    storagePath: row.storage_path,
  };
}

/** Fetch one joined message and append it to the cache if it isn't there yet. */
async function appendMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  messageId: string,
) {
  const { rows, replies } = await fetchRows(messageId).catch(() => ({
    rows: [] as MessageRow[],
    replies: new Map<string, ChatReply>(),
  }));
  if (!rows[0]) return;

  const message = toMessage(rows[0], replies);
  queryClient.setQueryData<ChatMessage[]>(chatKeys.messages, (current) => {
    const list = current ?? [];
    if (list.some((item) => item.id === message.id)) return list;
    return [...list, message];
  });
}

export function useChatMessages() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: chatKeys.messages,
    queryFn: async (): Promise<ChatMessage[]> => {
      // Newest 200 messages, oldest-first for rendering.
      const { rows, replies } = await fetchRows(null);
      return rows.reverse().map((row) => toMessage(row, replies));
    },
  });

  // Live updates: append new messages, drop deleted ones.
  useEffect(() => {
    const channel = supabase
      .channel("batch-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const id = (payload.new as { id?: string }).id;
          if (id) void appendMessage(queryClient, id);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages" },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (!id) return;
          queryClient.setQueryData<ChatMessage[]>(
            chatKeys.messages,
            (current) => (current ?? []).filter((message) => message.id !== id),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      senderId: string;
      body: string;
      gifId: string | null;
      replyToId: string | null;
    }) => {
      if (input.replyToId && !(await hasReplySupport())) {
        throw new Error(
          "Replies aren't switched on yet — apply the chat replies migration in Supabase (see README → Batch chat).",
        );
      }
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          sender_id: input.senderId,
          body: input.body,
          gif_id: input.gifId,
          // Left out entirely when not replying, so plain messages still send
          // against a database without the replies migration.
          ...(input.replyToId ? { reply_to_id: input.replyToId } : {}),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      // Show it immediately; the realtime event is deduped by id.
      void appendMessage(queryClient, id);
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
      return messageId;
    },
    onSuccess: (messageId) => {
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages, (current) =>
        (current ?? [])
          .filter((message) => message.id !== messageId)
          // The database clears quotes of a deleted message (on delete set
          // null), so drop that preview here too.
          .map((message) =>
            message.replyTo?.id === messageId
              ? { ...message, replyTo: null }
              : message,
          ),
      );
    },
  });
}

export function useChatGifs() {
  return useQuery({
    queryKey: chatKeys.gifs,
    queryFn: async (): Promise<ChatGif[]> => {
      const { data, error } = await supabase
        .from("chat_gifs")
        .select("id, name, url, storage_path")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as GifRow[]).map(toGif);
    },
  });
}

function gifExtension(type: string) {
  if (type === "video/mp4") return "mp4";
  if (type === "video/webm") return "webm";
  return "gif";
}

export function useUploadChatGif() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      file: File;
      name: string;
      userId: string;
    }): Promise<ChatGif> => {
      const { file, name, userId } = input;
      if (!gifTypes.includes(file.type)) {
        throw new Error("Choose a GIF, MP4, or WebM file.");
      }
      if (file.size > maxGifSize) {
        throw new Error("GIFs must be 10 MB or smaller.");
      }

      const path = `${userId}/${crypto.randomUUID()}.${gifExtension(file.type)}`;
      const { error: uploadError } = await supabase.storage
        .from(gifBucket)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const url = supabase.storage.from(gifBucket).getPublicUrl(path)
        .data.publicUrl;
      const { data, error } = await supabase
        .from("chat_gifs")
        .insert({
          name,
          url,
          storage_path: path,
          uploaded_by: userId,
        })
        .select("id, name, url, storage_path")
        .single();
      if (error) {
        // Roll back the orphaned upload so the bucket stays clean.
        await supabase.storage.from(gifBucket).remove([path]);
        throw error;
      }
      return toGif(data as unknown as GifRow);
    },
    onSuccess: (gif) => {
      queryClient.setQueryData<ChatGif[]>(chatKeys.gifs, (current) => [
        gif,
        ...(current ?? []),
      ]);
    },
  });
}

export function useDeleteChatGif() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gif: ChatGif) => {
      const { error } = await supabase
        .from("chat_gifs")
        .delete()
        .eq("id", gif.id);
      if (error) throw error;
      if (gif.storagePath) {
        await supabase.storage.from(gifBucket).remove([gif.storagePath]);
      }
      return gif.id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<ChatGif[]>(chatKeys.gifs, (current) =>
        (current ?? []).filter((gif) => gif.id !== id),
      );
    },
  });
}
