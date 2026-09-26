import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Shell } from "@/components/batch/Shell";
import { TryOnPanel } from "@/components/batch/TryOnPanel";
import { batch, fallbackImages, type ClothingItem } from "@/data/batch";
import {
  useAddSuggestion,
  useCastVote,
  useClothingPolls,
} from "@/hooks/use-batch-data";
import { useAuth } from "@/hooks/use-auth";

const title = `Senior clothes — ${batch.shortName} Class of ${batch.year}`;
const description =
  "Browse the senior jersey designs, try them on, vote for your favourite and leave a suggestion.";

export const Route = createFileRoute("/clothes")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClothesPage,
});

function ClothesPage() {
  const { data: polls, isLoading, error } = useClothingPolls();
  const castVote = useCastVote();
  const addSuggestion = useAddSuggestion();
  const { user, signInWithGoogle } = useAuth();

  const poll = polls[0];
  const items: ClothingItem[] = (poll?.options ?? []).map((o) => ({
    id: o.id,
    name: o.label,
    detail: poll?.question ?? "",
    image: o.image ?? fallbackImages.monogram,
    votes: o.votes,
  }));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const voted = poll?.myOptionId;

  async function handleVote() {
    if (!poll || !selected) return;
    if (!user) {
      await signInWithGoogle();
      return;
    }
    await castVote.mutateAsync({ pollId: poll.id, optionId: selected.id });
  }

  async function handleSuggest(event: FormEvent) {
    event.preventDefault();
    if (!poll) return;
    if (!user) {
      await signInWithGoogle();
      return;
    }
    const text = note.trim();
    if (!text) return;
    await addSuggestion.mutateAsync({ pollId: poll.id, text });
    setNote("");
  }

  return (
    <Shell>
      <PageTitle
        eyebrow="Senior clothes"
        title="What we'll be wearing."
        blurb="Pick a design, see it on you, then vote. Orders lock once the vote closes."
      />

      {error ? (
        <p className="mt-6 text-[12px] text-muted-foreground">
          Couldn't load designs. Please refresh.
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-[12px] text-muted-foreground">
          Loading designs…
        </p>
      ) : !poll || !selected ? (
        <p className="mt-6 text-[12px] text-muted-foreground">
          No senior clothes designs are up for a vote right now.
        </p>
      ) : (
        <div className="mt-6 lg:grid lg:grid-cols-2 lg:gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`animate-rise overflow-hidden rounded-3xl text-left ring-1 ring-inset transition-transform duration-200 hover:-translate-y-0.5 glass ${
                  selected.id === item.id ? "ring-accent" : "ring-border"
                }`}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="aspect-square w-full object-cover"
                />
                <div className="p-3">
                  <div className="text-[13px] font-semibold">{item.name}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {item.detail}
                  </div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-accent">
                    {item.votes} {item.votes === 1 ? "vote" : "votes"}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3 lg:mt-0">
            <TryOnPanel item={selected} />

            <button
              type="button"
              onClick={() => void handleVote()}
              disabled={castVote.isPending}
              className={`w-full rounded-2xl px-4 py-3 text-[13px] font-bold transition-transform duration-150 active:scale-[0.98] disabled:opacity-70 ${
                voted === selected.id
                  ? "bg-secondary text-muted-foreground"
                  : "bg-accent text-accent-foreground"
              }`}
            >
              {voted === selected.id
                ? `Voted ${selected.name}`
                : castVote.isPending
                  ? "Saving vote…"
                  : `Vote ${selected.name}`}
            </button>

            <div className="rounded-3xl p-4 glass">
              <div className="eyebrow">Suggestions</div>
              <div className="mt-2 space-y-2">
                {poll.suggestions.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">
                    Tell the reps what you'd change about this design.
                  </p>
                ) : (
                  poll.suggestions.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-2xl p-3 text-[12px] glass"
                    >
                      <span className="font-semibold text-accent">
                        {s.author}
                      </span>{" "}
                      <span className="text-muted-foreground">{s.text}</span>
                    </div>
                  ))
                )}
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => void handleSuggest(e)}
              >
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a suggestion…"
                  className="min-w-0 flex-1 rounded-2xl bg-well px-3 py-2 text-[12px] outline-none ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-accent/50"
                />
                <button
                  type="submit"
                  disabled={addSuggestion.isPending}
                  className="rounded-2xl bg-accent px-4 text-[12px] font-bold text-accent-foreground disabled:opacity-70"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
