import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Shell } from "@/components/batch/Shell";
import { PollCard } from "@/components/batch/PollCard";
import { batch } from "@/data/batch";
import { usePolls } from "@/hooks/use-batch-data";

const title = `Decisions — ${batch.shortName} Class of ${batch.year}`;
const description =
  "Live batch votes on the senior jersey, Culture Day and graduation night. Vote and drop a suggestion.";

export const Route = createFileRoute("/decisions")({
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
  component: DecisionsPage,
});

function DecisionsPage() {
  const { data, isLoading, error } = usePolls();
  const polls = data ?? [];

  return (
    <Shell>
      <PageTitle
        eyebrow={
          isLoading ? "Loading decisions" : `${polls.length} decisions open`
        }
        title="You decide how this year ends."
        blurb="Every call the batch makes goes through here. Vote, see where it stands, and say what you'd change."
      />

      {error ? (
        <p className="mt-6 text-[12px] text-muted-foreground">
          Couldn't load decisions. Please refresh.
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-[12px] text-muted-foreground">
          Loading decisions…
        </p>
      ) : polls.length === 0 ? (
        <p className="mt-6 text-[12px] text-muted-foreground">
          No decisions are open right now. Check back soon.
        </p>
      ) : (
        <div className="lg:grid lg:grid-cols-2 lg:gap-4">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} withSuggestions />
          ))}
        </div>
      )}
    </Shell>
  );
}
