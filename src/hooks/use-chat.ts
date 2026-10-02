import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type ChatGif = {
  id: string;
  name: string;
  url: string;
  storagePath: string;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string | null;
  senderAvatar: string | null;
  gif: ChatGif | null;
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

type MessageRow = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
  sender: { full_name: string | null; avatar_url: string | null } | null;
  gif: { id: string; url: string; name: string } | null;
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
  };
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
  const { data, error } = await supabase
    .from("chat_messages")
    .select(messageSelect)
    .eq("id", messageId)
    .maybeSingle();
  if (error || !data) return;

  const message = toMessage(data as unknown as MessageRow);
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
      const { data, error } = await supabase
        .from("chat_messages")
        .select(messageSelect)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as unknown as MessageRow[]).reverse().map(toMessage);
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
    }) => {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          sender_id: input.senderId,
          body: input.body,
          gif_id: input.gifId,
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
        (current ?? []).filter((message) => message.id !== messageId),
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
