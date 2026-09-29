import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageTitle, Shell } from "@/components/batch/Shell";
import { MemoryGrid } from "@/components/batch/MemoryGrid";
import { batch, type Memory } from "@/data/batch";
import { useMemories } from "@/hooks/use-batch-data";

const title = `Memories — ${batch.shortName} Class of ${batch.year}`;
const description =
  "Photos and moments from our final year, grouped by the events they came from.";

export const Route = createFileRoute("/memories")({
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
  component: MemoriesPage,
});

function MemoriesPage() {
  const { data, isLoading, error } = useMemories();
  const [activeAlbum, setActiveAlbum] = useState("All");
  const memories = data ?? [];
  const albums = [...new Set(memories.map((memory) => memory.event))].sort();
  const visibleMemories =
    activeAlbum === "All"
      ? memories
      : memories.filter((memory) => memory.event === activeAlbum);

  const groups = visibleMemories.reduce<Record<string, Memory[]>>((acc, m) => {
    (acc[m.event] ??= []).push(m);
    return acc;
  }, {});

  return (
    <Shell>
      <PageTitle
        eyebrow="We were here"
        title="Moments from our final year."
        blurb="Everything the batch has captured so far, grouped by where it happened."
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex gap-1.5 overflow-x-auto"
          aria-label="Memory albums"
        >
          {["All", ...albums].map((album) => (
            <button
              key={album}
              type="button"
              onClick={() => setActiveAlbum(album)}
              aria-pressed={activeAlbum === album}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] transition-colors ${activeAlbum === album ? "bg-accent text-accent-foreground" : "text-muted-foreground glass hover:text-foreground"}`}
            >
              {album}
            </button>
          ))}
        </div>
        <Link
          to="/manage"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12px] font-bold text-accent-foreground transition-transform hover:-translate-y-0.5"
        >
          <Plus size={15} aria-hidden="true" />
          Add memory
        </Link>
      </div>

      {error ? (
        <p className="mt-6 text-[12px] text-muted-foreground">
          Couldn't load memories. Please refresh.
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-[12px] text-muted-foreground">
          Loading memories…
        </p>
      ) : memories.length === 0 ? (
        <div className="mt-5 rounded-2xl p-4 glass">
          <p className="text-[12px] text-muted-foreground">
            No memories uploaded yet. Class reps can add the first photo from
            the publishing workspace.
          </p>
        </div>
      ) : visibleMemories.length === 0 ? (
        <p className="mt-6 text-[12px] text-muted-foreground">
          Nothing in this album yet.
        </p>
      ) : (
        Object.entries(groups).map(([event, items]) => (
          <section key={event} className="mt-7">
            <div className="flex items-center justify-between">
              <div className="eyebrow">{event}</div>
              <div className="font-mono text-[10px] text-muted-foreground">
                {items.length} {items.length === 1 ? "photo" : "photos"}
              </div>
            </div>
            <MemoryGrid items={items} withCaptions />
          </section>
        ))
      )}
    </Shell>
  );
}
