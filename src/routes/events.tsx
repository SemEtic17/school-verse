import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Shell } from "@/components/batch/Shell";
import { EventCard } from "@/components/batch/EventCard";
import { batch } from "@/data/batch";
import { useEvents } from "@/hooks/use-batch-data";

const title = `Events — ${batch.shortName} Class of ${batch.year}`;
const description =
  "Culture Day, Sports Day, Graduation Night and everything else our batch is planning.";

export const Route = createFileRoute("/events")({
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
  component: EventsPage,
});

function EventsPage() {
  const { data, isLoading, error } = useEvents();
  const events = data ?? [];
  const upcoming = events.filter((e) => !e.past);
  const past = events.filter((e) => e.past);

  return (
    <Shell>
      <PageTitle
        eyebrow="What's coming"
        title="Every batch event, one place."
        blurb="Dates, plans and who's in. Some events have a vote attached — that's where you decide how it goes."
      />

      {error ? (
        <p className="mt-6 text-[12px] text-muted-foreground">
          Couldn't load events. Please refresh.
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-[12px] text-muted-foreground">
          Loading events…
        </p>
      ) : (
        <>
          <div className="eyebrow mt-6">Upcoming</div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {upcoming.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                Nothing scheduled yet.
              </p>
            ) : (
              upcoming.map((e) => <EventCard key={e.id} event={e} />)
            )}
          </div>

          <div className="eyebrow mt-8">Already happened</div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {past.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                No past events yet.
              </p>
            ) : (
              past.map((e) => <EventCard key={e.id} event={e} />)
            )}
          </div>
        </>
      )}
    </Shell>
  );
}
