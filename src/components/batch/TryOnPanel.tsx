import { useState } from "react";
import type { ClothingItem } from "@/data/batch";

/**
 * Virtual try-on shell.
 * The actual generation is done by an external AI try-on service that gets
 * wired in later — `onTryOn` is the single integration point.
 */
export function TryOnPanel({
  item,
  onTryOn,
}: {
  item: ClothingItem;
  onTryOn?: (args: { itemId: string; photo: File }) => Promise<string>;
}) {
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "unavailable">(
    "idle",
  );
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    if (!photo) return;
    if (!onTryOn) {
      setStatus("unavailable");
      return;
    }
    setStatus("running");
    const url = await onTryOn({ itemId: item.id, photo: photo.file });
    setResult(url);
    setStatus("done");
  }

  return (
    <div className="rounded-3xl p-4 glass">
      <div className="eyebrow">Virtual try-on</div>
      <div className="mt-1 text-[13px] font-semibold">{item.name}</div>

      <label className="mt-3 flex cursor-pointer items-center justify-between rounded-2xl bg-well px-4 py-3 text-[12px] ring-1 ring-inset ring-border">
        <span className="text-muted-foreground">
          {photo ? photo.file.name : "Upload your photo"}
        </span>
        <span className="font-semibold text-accent">Browse</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setPhoto({ file, url: URL.createObjectURL(file) });
            setStatus("idle");
            setResult(null);
          }}
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="overflow-hidden rounded-2xl ring-1 ring-inset ring-border">
          {photo ? (
            <img
              src={photo.url}
              alt="Your upload"
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="grid aspect-square place-items-center bg-well text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              You
            </div>
          )}
        </div>
        <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl bg-well text-center ring-1 ring-inset ring-border">
          {result ? (
            <img src={result} alt="Try-on result" className="size-full object-cover" />
          ) : (
            <span className="px-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {status === "running"
                ? "Generating…"
                : status === "unavailable"
                  ? "Try-on service not connected yet"
                  : "Result"}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={run}
        disabled={!photo || status === "running"}
        className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 text-[13px] font-bold text-accent-foreground transition-transform duration-150 active:scale-[0.98] disabled:bg-secondary disabled:text-muted-foreground"
      >
        Try this design
      </button>
    </div>
  );
}
