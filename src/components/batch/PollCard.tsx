import { useState, type FormEvent } from "react";

import { totalVotes, type Poll } from "@/data/batch";
import { useAddSuggestion, useCastVote } from "@/hooks/use-batch-data";
import { useAuth } from "@/hooks/use-auth";

export function PollCard({
  poll,
  withSuggestions = false,
}: {
  poll: Poll;
  withSuggestions?: boolean;
}) {
  const { user, signInWithGoogle } = useAuth();
  const castVote = useCastVote();
  const addSuggestion = useAddSuggestion();

  const [selected, setSelected] = useState(poll.options[0]?.id ?? "");
  const [suggestion, setSuggestion] = useState("");

  const voted = poll.myOptionId;
  const total = totalVotes(poll);
  const hasImages = poll.options.some((o) => o.image);
  const active = voted ?? selected;
  const closed = poll.closesAt
    ? new Date(poll.closesAt).getTime() <= Date.now()
    : false;

  async function handleVote() {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (!selected || closed) return;
    await castVote.mutateAsync({ pollId: poll.id, optionId: selected });
  }

  async function handleSuggest(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      await signInWithGoogle();
      return;
    }
    const text = suggestion.trim();
    if (!text) return;
    await addSuggestion.mutateAsync({ pollId: poll.id, text });
    setSuggestion("");
  }

  return (
    <div className="animate-rise mt-4 rounded-3xl p-4 glass">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] font-semibold">{poll.title}</div>
        {poll.closesIn ? (
          <div className="shrink-0 font-mono text-[9px] uppercase tracking-[0.15em] text-accent">
            {poll.closesIn}
          </div>
        ) : null}
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">{poll.question}</p>

      {poll.options.length === 0 ? (
        <p className="mt-3 text-[12px] text-muted-foreground">
          No options yet — a class rep needs to add some.
        </p>
      ) : hasImages ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {poll.options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setSelected(o.id)}
              disabled={closed}
              className={`relative overflow-hidden rounded-2xl ring-1 ring-inset transition-transform duration-200 hover:-translate-y-0.5 ${
                active === o.id ? "ring-accent" : "ring-border"
              }`}
            >
              <img
                src={o.image}
                alt={o.label}
                loading="lazy"
                width={1024}
                height={1024}
                className="aspect-square w-full object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded-full bg-well px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md">
                {o.label}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {poll.options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setSelected(o.id)}
              disabled={closed}
              className={`rounded-full px-3 py-1.5 text-[12px] ring-1 ring-inset transition-colors ${
                active === o.id
                  ? "bg-accent/15 text-accent ring-accent/40"
                  : "text-muted-foreground ring-border hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {poll.options.map((o, i) => {
          const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
          return (
            <div key={o.id}>
              <div className="mb-1 flex justify-between text-[11px]">
                <span
                  className={`font-semibold ${i === 0 ? "text-accent" : "text-ice"}`}
                >
                  {pct}%
                </span>
                <span className="text-muted-foreground">{o.label}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`animate-fill h-full rounded-full ${i === 0 ? "bg-accent" : "bg-ice"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => void handleVote()}
        disabled={castVote.isPending || closed || poll.options.length === 0}
        className={`mt-4 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-[13px] font-bold transition-transform duration-150 active:scale-[0.98] disabled:opacity-70 ${
          voted
            ? "bg-secondary text-muted-foreground"
            : "bg-accent text-accent-foreground"
        }`}
      >
        <span>
          {closed
            ? "Voting closed"
            : voted
              ? `Voted ${poll.options.find((o) => o.id === voted)?.label ?? ""}`
              : castVote.isPending
                ? "Saving vote…"
                : `Vote ${poll.options.find((o) => o.id === selected)?.label ?? ""}`}
        </span>
        <span>{voted ? "✓" : "→"}</span>
      </button>

      <div className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
        {total} {total === 1 ? "vote" : "votes"}
      </div>

      {withSuggestions ? (
        <div className="mt-4 border-t border-border pt-4">
          <div className="eyebrow">Suggestions</div>
          <div className="mt-2 space-y-2">
            {poll.suggestions.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                No suggestions yet — be first.
              </p>
            ) : (
              poll.suggestions.map((s) => (
                <div key={s.id} className="rounded-2xl p-3 text-[12px] glass">
                  <span className="font-semibold text-accent">{s.author}</span>{" "}
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
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
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
      ) : null}
    </div>
  );
}
