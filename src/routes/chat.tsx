import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ImagePlay, Reply, Send, Trash2, X } from "lucide-react";
import { PageTitle, Shell } from "@/components/batch/Shell";
import { useAuth } from "@/hooks/use-auth";
import {
  isVideoUrl,
  useChatGifs,
  useChatMessages,
  useDeleteMessage,
  useSendMessage,
  type ChatGif,
  type ChatMessage,
} from "@/hooks/use-chat";

const title = "Batch chat — SchoolVerse";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title }] }),
  component: ChatPage,
});

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChatPage() {
  const { user, profile, loading, signInWithGoogle } = useAuth();
  const messages = useChatMessages();
  const gifs = useChatGifs();
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();

  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stickToBottom = useRef(true);
  const initialised = useRef(false);

  const list = messages.data ?? [];
  const canManage = profile?.role === "admin" || profile?.role === "rep";

  // Follow new messages only when the reader is already near the bottom.
  useEffect(() => {
    if (list.length === 0) return;
    if (!initialised.current) {
      initialised.current = true;
      stickToBottom.current = true;
    } else if (!stickToBottom.current) {
      return;
    }
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [list.length]);

  function onScroll() {
    const element = scrollRef.current;
    if (!element) return;
    stickToBottom.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 120;
  }

  async function send(gif: ChatGif | null) {
    if (!user || sendMessage.isPending) return;
    const text = body.trim();
    if (!text && !gif) return;
    setNotice(null);
    try {
      await sendMessage.mutateAsync({
        senderId: user.id,
        body: text,
        gifId: gif?.id ?? null,
        replyToId: replyTo?.id ?? null,
      });
      setBody("");
      setReplyTo(null);
      setPickerOpen(false);
      stickToBottom.current = true;
    } catch (error) {
      setNotice(errorText(error));
    }
  }

  function startReply(message: ChatMessage) {
    setReplyTo(message);
    inputRef.current?.focus();
  }

  /** Scroll the quoted message into view and flash it, without moving the page. */
  function jumpToMessage(messageId: string) {
    const container = scrollRef.current;
    const target = container?.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`,
    );
    if (!container || !target) return;
    const top =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      12;
    container.scrollTo({ top, behavior: "smooth" });
    setHighlightId(messageId);
    window.setTimeout(
      () =>
        setHighlightId((current) => (current === messageId ? null : current)),
      1600,
    );
  }

  async function remove(message: ChatMessage) {
    setNotice(null);
    try {
      await deleteMessage.mutateAsync(message.id);
    } catch (error) {
      setNotice(errorText(error));
    }
  }

  if (loading) {
    return (
      <Shell>
        <PageTitle eyebrow="Batch hangout" title="Loading the chat." />
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <PageTitle
          eyebrow="Batch hangout"
          title="Sign in to join the chat."
          blurb="The group chat is for batch members — sign in with your school Google account to read and post."
        />
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          className="mt-5 rounded-xl bg-accent px-4 py-3 text-[13px] font-semibold text-accent-foreground"
        >
          Continue with Google
        </button>
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell>
        <PageTitle eyebrow="Batch hangout" title="Setting up your profile." />
      </Shell>
    );
  }

  return (
    <Shell>
      <PageTitle
        eyebrow="Batch hangout"
        title="The group chat."
        blurb="Talk with the batch, reply to any message, and drop your custom memes — tap the GIF button to send one."
      />

      <div className="mt-5 flex flex-col rounded-3xl p-3 glass">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-[52vh] min-h-[320px] space-y-3 overflow-y-auto pr-1"
          aria-label="Chat messages"
        >
          {messages.isLoading ? (
            <p className="p-3 text-[12px] text-muted-foreground">
              Loading messages…
            </p>
          ) : null}
          {messages.isError ? (
            <p className="p-3 text-[12px] text-destructive">
              {errorText(messages.error)}
            </p>
          ) : null}
          {!messages.isLoading && list.length === 0 ? (
            <p className="p-3 text-[12px] text-muted-foreground">
              No messages yet — say hi to the batch. 👋
            </p>
          ) : null}

          {list.map((message, index) => {
            const previous = list[index - 1];
            const newDay =
              !previous ||
              !sameDay(
                new Date(previous.createdAt),
                new Date(message.createdAt),
              );
            return (
              <div
                key={message.id}
                data-message-id={message.id}
                className={`rounded-2xl transition-shadow duration-500 ${
                  highlightId === message.id ? "ring-2 ring-accent/70" : ""
                }`}
              >
                {newDay ? (
                  <div className="my-3 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {dayLabel(message.createdAt)}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                ) : null}
                <MessageRow
                  message={message}
                  own={message.senderId === user.id}
                  onReply={() => startReply(message)}
                  onDelete={() => void remove(message)}
                  onJumpToReply={jumpToMessage}
                />
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {notice ? (
          <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {notice}
          </p>
        ) : null}

        {replyTo ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-well px-3 py-2 ring-1 ring-inset ring-border">
            <Reply size={14} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold text-accent">
                Replying to {replyTo.senderName ?? "a batch member"}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {replyTo.body || (replyTo.gif ? "GIF" : "Message")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              aria-label="Cancel reply"
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        {pickerOpen ? (
          <GifPicker
            gifs={gifs.data ?? []}
            loading={gifs.isLoading}
            canManage={canManage}
            onPick={(gif) => void send(gif)}
          />
        ) : null}

        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void send(null);
          }}
        >
          <input
            ref={inputRef}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && replyTo) setReplyTo(null);
            }}
            maxLength={1000}
            placeholder={replyTo ? "Write a reply…" : "Message the batch…"}
            aria-label={replyTo ? "Reply" : "Message"}
            className="min-w-0 flex-1 rounded-xl bg-well px-3 py-2.5 text-[13px] outline-none ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-accent/50"
          />
          <button
            type="button"
            onClick={() => setPickerOpen((open) => !open)}
            aria-label={pickerOpen ? "Close GIF picker" : "Open GIF picker"}
            aria-expanded={pickerOpen}
            className={`grid size-10 shrink-0 place-items-center rounded-full ring-1 ring-inset transition-colors ${
              pickerOpen
                ? "bg-accent text-accent-foreground ring-accent"
                : "text-muted-foreground ring-border hover:text-foreground"
            }`}
          >
            <ImagePlay size={16} />
          </button>
          <button
            type="submit"
            disabled={!body.trim() || sendMessage.isPending}
            aria-label="Send message"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition-opacity disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </Shell>
  );
}

function MessageRow({
  message,
  own,
  onReply,
  onDelete,
  onJumpToReply,
}: {
  message: ChatMessage;
  own: boolean;
  onReply: () => void;
  onDelete: () => void;
  onJumpToReply: (messageId: string) => void;
}) {
  const name = message.senderName ?? "Batch member";
  const reply = message.replyTo;

  return (
    <div className={`group flex items-end gap-2 ${own ? "justify-end" : ""}`}>
      {!own ? (
        message.senderAvatar ? (
          <img
            src={message.senderAvatar}
            alt=""
            className="size-7 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-well text-[10px] font-semibold">
            {name.charAt(0).toUpperCase()}
          </span>
        )
      ) : null}

      {own ? (
        <div className="mb-1 flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onReply}
            aria-label="Reply to this message"
            title="Reply"
            className="text-muted-foreground/60 transition-colors hover:text-accent"
          >
            <Reply size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete message"
            className="text-muted-foreground/60 opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ) : null}

      <div className={`max-w-[78%] ${own ? "text-right" : ""}`}>
        <div className="px-1 text-[10px] text-muted-foreground">
          {own
            ? timeLabel(message.createdAt)
            : `${name} · ${timeLabel(message.createdAt)}`}
        </div>
        <div
          className={`mt-1 inline-block rounded-2xl px-3 py-2 text-left text-[13px] leading-relaxed ${
            own
              ? "rounded-br-md bg-accent text-accent-foreground"
              : "rounded-bl-md bg-well ring-1 ring-inset ring-border"
          }`}
        >
          {reply ? (
            <button
              type="button"
              onClick={() => onJumpToReply(reply.id)}
              title="Jump to the quoted message"
              className={`mb-2 inline-block max-w-[220px] rounded-lg border-l-2 px-2 py-1 align-top text-left text-[11px] ${
                own
                  ? "border-accent-foreground/60 bg-accent-foreground/15"
                  : "border-accent/70 bg-secondary"
              }`}
            >
              <span className="block truncate font-semibold">
                {reply.senderName ?? "Batch member"}
              </span>
              <span
                className={`block truncate ${
                  own ? "text-accent-foreground/80" : "text-muted-foreground"
                }`}
              >
                {reply.body || (reply.gifUrl ? "GIF" : "Message")}
              </span>
            </button>
          ) : null}
          {message.gif ? (
            <span className="block overflow-hidden rounded-xl">
              {isVideoUrl(message.gif.url) ? (
                <video
                  src={message.gif.url}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className="max-h-64 w-full max-w-[220px] object-cover"
                />
              ) : (
                <img
                  src={message.gif.url}
                  alt={message.gif.name}
                  loading="lazy"
                  className="max-h-64 w-full max-w-[220px] object-cover"
                />
              )}
            </span>
          ) : null}
          {message.body ? (
            <span className={`block break-words ${message.gif ? "mt-2" : ""}`}>
              {message.body}
            </span>
          ) : null}
        </div>
      </div>

      {!own ? (
        <button
          type="button"
          onClick={onReply}
          aria-label={`Reply to ${name}`}
          title="Reply"
          className="mb-1 shrink-0 text-muted-foreground/60 transition-colors hover:text-accent"
        >
          <Reply size={13} />
        </button>
      ) : null}
    </div>
  );
}

function GifPicker({
  gifs,
  loading,
  canManage,
  onPick,
}: {
  gifs: ChatGif[];
  loading: boolean;
  canManage: boolean;
  onPick: (gif: ChatGif) => void;
}) {
  if (loading) {
    return (
      <p className="mt-3 rounded-2xl bg-well p-3 text-[12px] text-muted-foreground">
        Loading GIFs…
      </p>
    );
  }

  if (gifs.length === 0) {
    return (
      <div className="mt-3 rounded-2xl bg-well p-3 text-[12px] text-muted-foreground">
        No GIFs yet.{" "}
        {canManage ? (
          <>
            Add the first ones in{" "}
            <Link
              to="/manage"
              className="text-accent underline underline-offset-4"
            >
              Manage → GIFs
            </Link>
            .
          </>
        ) : (
          "Ask a class rep to add some in Manage → GIFs."
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 grid max-h-56 grid-cols-3 gap-2 overflow-y-auto rounded-2xl bg-well p-2">
      {gifs.map((gif) => (
        <button
          key={gif.id}
          type="button"
          onClick={() => onPick(gif)}
          title={gif.name}
          className="overflow-hidden rounded-xl ring-1 ring-inset ring-border transition-transform hover:scale-[1.02]"
        >
          {isVideoUrl(gif.url) ? (
            <video
              src={gif.url}
              muted
              loop
              autoPlay
              playsInline
              className="h-20 w-full object-cover"
            />
          ) : (
            <img
              src={gif.url}
              alt={gif.name}
              loading="lazy"
              className="h-20 w-full object-cover"
            />
          )}
        </button>
      ))}
    </div>
  );
}
