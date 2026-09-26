import { createFileRoute } from "@tanstack/react-router";
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
  const memories = data ?? [];

  const groups = memories.reduce<Record<string, Memory[]>>((acc, m) => {
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
        <p className="mt-6 text-[12px] text-muted-foreground">
          No memories uploaded yet.
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
