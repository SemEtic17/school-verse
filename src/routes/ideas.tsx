import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Shell } from "@/components/batch/Shell";
import { IdeaCard } from "@/components/batch/IdeaCard";
import { batch, ideaCategories } from "@/data/batch";
import { useCreateIdea, useIdeas } from "@/hooks/use-batch-data";
import { useAuth } from "@/hooks/use-auth";

const title = `Ideas — ${batch.shortName} Class of ${batch.year}`;
const description =
  "Student ideas for events, clothes and memories. Post yours and back the ones you like.";

export const Route = createFileRoute("/ideas")({
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
  component: IdeasPage,
});

function IdeasPage() {
  const { data, isLoading, error } = useIdeas();
  const createIdea = useCreateIdea();
  const { user, signInWithGoogle } = useAuth();

  const [category, setCategory] = useState("All");
  const [form, setForm] = useState({ title: "", body: "", category: "Events" });
  const [open, setOpen] = useState(false);

  const ideas = data ?? [];
  const filtered =
    category === "All" ? ideas : ideas.filter((i) => i.category === category);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const titleValue = form.title.trim();
    if (!titleValue) return;
    if (!user) {
      await signInWithGoogle();
      return;
    }
    await createIdea.mutateAsync({
      title: titleValue,
      description: form.body.trim(),
      category: form.category,
    });
    setForm({ title: "", body: "", category: "Events" });
    setOpen(false);
  }

  return (
    <Shell>
      <PageTitle
        eyebrow={isLoading ? "Loading ideas" : `${ideas.length} ideas so far`}
        title="Good ideas beat good intentions."
        blurb="Anything you want the batch to do — put it here. The ones with the most backing get taken to the reps."
      />

      <div className="mt-5 flex gap-1.5 overflow-x-auto">
        {ideaCategories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] transition-colors ${
              category === c
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground glass"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-4 w-full rounded-2xl bg-accent px-4 py-3 text-[13px] font-bold text-accent-foreground transition-transform duration-150 active:scale-[0.98]"
      >
        {open ? "Close" : "Post an idea"}
      </button>

      {open ? (
        <form
          className="animate-rise mt-3 space-y-2 rounded-3xl p-4 glass"
          onSubmit={(e) => void handleSubmit(e)}
        >
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Idea title"
            className="w-full rounded-2xl bg-well px-3 py-2 text-[12px] outline-none ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-accent/50"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Describe it in a line or two"
            rows={3}
            className="w-full rounded-2xl bg-well px-3 py-2 text-[12px] outline-none ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-accent/50"
          />
          <div className="flex gap-1.5 overflow-x-auto">
            {ideaCategories
              .filter((c) => c !== "All")
              .map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, category: c })}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] ${
                    form.category === c
                      ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/40"
                      : "text-muted-foreground ring-1 ring-inset ring-border"
                  }`}
                >
                  {c}
                </button>
              ))}
          </div>
          <button
            type="submit"
            disabled={createIdea.isPending}
            className="w-full rounded-2xl bg-accent px-4 py-2.5 text-[12px] font-bold text-accent-foreground disabled:opacity-70"
          >
            {createIdea.isPending ? "Posting…" : "Post idea"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-4 text-[12px] text-muted-foreground">
          Couldn't load ideas. Please refresh.
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-[12px] text-muted-foreground">Loading ideas…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-[12px] text-muted-foreground">
          Nothing here yet — post the first idea.
        </p>
      ) : (
        <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
          {filtered.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </Shell>
  );
}
