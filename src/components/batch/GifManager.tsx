import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  isVideoUrl,
  useChatGifs,
  useDeleteChatGif,
  useUploadChatGif,
  type ChatGif,
} from "@/hooks/use-chat";

const inputClass =
  "w-full rounded-xl bg-well px-3 py-2.5 text-[13px] outline-none ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-accent/50";

type Notice = { kind: "success" | "error"; text: string };

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

/**
 * Curated meme library for the batch chat: reps and admins upload the custom
 * face GIFs here, everyone else sends them from the chat GIF picker.
 */
export function GifManager() {
  const { user } = useAuth();
  const gifs = useChatGifs();
  const upload = useUploadChatGif();
  const removeGif = useDeleteChatGif();

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const pending = upload.isPending || removeGif.isPending;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || pending) return;
    if (!file) {
      setNotice({ kind: "error", text: "Choose a GIF, MP4, or WebM file." });
      return;
    }

    setNotice(null);
    try {
      await upload.mutateAsync({
        file,
        name: name.trim() || file.name.replace(/\.[^.]+$/, ""),
        userId: user.id,
      });
      setName("");
      setFile(null);
      setNotice({ kind: "success", text: "GIF added to the chat library." });
    } catch (error) {
      setNotice({ kind: "error", text: errorText(error) });
    }
  }

  async function deleteGif(gif: ChatGif) {
    setConfirmId(null);
    setNotice(null);
    try {
      await removeGif.mutateAsync(gif);
      setNotice({ kind: "success", text: "GIF removed." });
    } catch (error) {
      setNotice({ kind: "error", text: errorText(error) });
    }
  }

  return (
    <>
      <form className="space-y-3" onSubmit={(event) => void save(event)}>
        <div className="space-y-1.5">
          <label
            htmlFor="gif-name"
            className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
          >
            GIF name
          </label>
          <input
            id="gif-name"
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="Shocked face reaction"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="gif-file"
            className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
          >
            GIF, MP4, or WebM (max 10 MB)
          </label>
          <input
            id="gif-file"
            className={inputClass}
            type="file"
            accept="image/gif,video/mp4,video/webm"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="overflow-hidden rounded-xl ring-1 ring-inset ring-border">
              {file.type.startsWith("video/") ? (
                <video
                  src={URL.createObjectURL(file)}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className="h-32 w-full object-cover"
                />
              ) : (
                <img
                  src={URL.createObjectURL(file)}
                  alt="Selected GIF preview"
                  className="h-32 w-full object-cover"
                />
              )}
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-accent px-4 py-3 text-[13px] font-semibold text-accent-foreground disabled:opacity-50"
        >
          {upload.isPending ? "Uploading…" : "Add GIF to chat"}
        </button>
      </form>

      {notice ? (
        <p
          role="status"
          className={`mt-4 rounded-xl px-3 py-2.5 text-[12px] ${notice.kind === "error" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"}`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        In the library
      </div>

      {gifs.isLoading ? (
        <p className="mt-3 text-[12px] text-muted-foreground">Loading GIFs…</p>
      ) : (gifs.data ?? []).length === 0 ? (
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          No GIFs yet. Generate memes with the batch&apos;s faces using a free
          tool, then upload them here — everyone can send them from the chat.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {(gifs.data ?? []).map((gif) => (
            <li
              key={gif.id}
              className="relative overflow-hidden rounded-xl ring-1 ring-inset ring-border"
            >
              {isVideoUrl(gif.url) ? (
                <video
                  src={gif.url}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="h-24 w-full object-cover"
                />
              ) : (
                <img
                  src={gif.url}
                  alt={gif.name}
                  loading="lazy"
                  className="h-24 w-full object-cover"
                />
              )}
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-[10px] text-white">
                {gif.name}
              </span>
              {confirmId === gif.id ? (
                <span className="absolute inset-0 grid place-items-center gap-2 bg-black/70 p-2 text-center">
                  <span className="text-[10px] text-white">
                    Remove this GIF?
                  </span>
                  <span className="flex gap-3 text-[11px]">
                    <button
                      type="button"
                      onClick={() => void deleteGif(gif)}
                      className="font-semibold text-red-300"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="text-white/70"
                    >
                      Cancel
                    </button>
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(gif.id)}
                  aria-label={`Remove ${gif.name}`}
                  className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/50 text-white/80 hover:text-white"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
