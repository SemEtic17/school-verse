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
  sender:profiles (full_name, avatar_url),
  gif:chat_gifs (id, url, name)
`;

/**
 * Quoting a message reads the parent row back through the `reply_to_id` foreign
 * key. That column ships in supabase/migrations/202610070001_chat_replies.sql;
 * until it is applied we quietly fall back to plain messages (see fetchRows).
 */
const messageSelectWithReply = `
  id,
  body,
  created_at,
  sender_id,
  sender:profiles (full_name, avatar_url),
  gif:chat_gifs (id, url, name),
  reply_to:chat_messages!reply_to_id (
    id,
    body,
    sender:profiles (full_name),
    gif:chat_gifs (url)
  )
`;

type ReplyRow = {
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
  reply_to?: ReplyRow | null;
};

type GifRow = {
  id: string;
  name: string;
  url: string;
  storage_path: string;
};

function toMessage(row: MessageRow): ChatMessage {
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
    replyTo: row.reply_to
      ? {
          id: row.reply_to.id,
          body: row.reply_to.body,
          senderName: row.reply_to.sender?.full_name ?? null,
          gifUrl: row.reply_to.gif?.url ?? null,
        }
      : null,
  };
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
    rows: (data ?? null) as unknown as MessageRow[] | MessageRow | null,
    error,
  };
}

/**
 * Load messages with their quoted parent, falling back to plain messages on a
 * database that has not run the replies migration yet.
 */
async function fetchRows(messageId: string | null) {
  const select = (await hasReplySupport())
    ? messageSelectWithReply
    : messageSelect;
  const { rows, error } = await selectRows(select, messageId);
  if (error) throw error;
  if (!rows) return [];
  return Array.isArray(rows) ? rows : [rows];
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
  const rows = await fetchRows(messageId).catch(() => []);
  if (!rows[0]) return;

  const message = toMessage(rows[0]);
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
      const rows = await fetchRows(null);
      return rows.reverse().map(toMessage);
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
