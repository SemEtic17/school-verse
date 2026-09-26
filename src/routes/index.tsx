import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/batch/Shell";
import { CountdownCard } from "@/components/batch/Countdown";
import { PollCard } from "@/components/batch/PollCard";
import { IdeaCard } from "@/components/batch/IdeaCard";
import { MemoryGrid } from "@/components/batch/MemoryGrid";
import { EventCard } from "@/components/batch/EventCard";
import { announcements, batch, type PulseItem } from "@/data/batch";
import {
  useEvents,
  useIdeas,
  useMemories,
  usePolls,
} from "@/hooks/use-batch-data";

const title = `${batch.shortName} Class of ${batch.year} — our batch, in one place`;
const description =
  "Vote on batch decisions, track events, share ideas and keep every memory from our final year.";

export const Route = createFileRoute("/")({
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
  component: Home,
});

const daysUntil = (iso: string) =>
  Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

function Home() {
  const eventsQuery = useEvents();
  const pollsQuery = usePolls();
  const ideasQuery = useIdeas();
  const memoriesQuery = useMemories();

  const events = eventsQuery.data ?? [];
  const polls = pollsQuery.data ?? [];
  const ideas = ideasQuery.data ?? [];
  const memories = memoriesQuery.data ?? [];

  const upcoming = events.filter((e) => !e.past);
  const next = upcoming[0];
  const featured = polls[0];

  const pulse: PulseItem[] = [];
  const closing = polls.filter(
    (p) => p.closesAt && new Date(p.closesAt).getTime() > Date.now(),
  ).length;
  if (closing > 0)
    pulse.push({
      label: `${closing} vote${closing === 1 ? "" : "s"} closing`,
      live: true,
    });
  if (next) pulse.push({ label: `${next.name} in ${daysUntil(next.date)}d` });
  if (memories.length > 0)
    pulse.push({
      label: `${memories.length} memor${memories.length === 1 ? "y" : "ies"}`,
    });
  if (ideas.length > 0)
    pulse.push({
      label: `${ideas.length} idea${ideas.length === 1 ? "" : "s"} posted`,
    });

  const loading = eventsQuery.isLoading || pollsQuery.isLoading;

  return (
    <Shell>
      {pulse.length > 0 ? (
        <div className="animate-rise mt-3 flex gap-1.5 overflow-x-auto">
          {pulse.map((p) => (
            <div
              key={p.label}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11px] ${
                p.live
                  ? "bg-accent/10 font-medium text-foreground ring-1 ring-inset ring-accent/25"
                  : "text-muted-foreground glass"
              }`}
            >
              {p.live ? (
                <span className="animate-blink size-1.5 rounded-full bg-accent" />
              ) : null}
              {p.label}
            </div>
          ))}
        </div>
      ) : null}

      <h1 className="animate-rise mt-6 text-balance font-display text-[44px] leading-[0.92] lg:text-[72px]">
        This is
        <br />
        the last
        <br />
        ride together.
      </h1>
      <p className="animate-rise mt-3 max-w-[34ch] text-pretty text-[13px] leading-relaxed text-muted-foreground">
        {batch.welcome}
      </p>

      <div className="lg:grid lg:grid-cols-2 lg:gap-4">
        <div>
          {next ? (
            <CountdownCard
              label={`${next.name} countdown`}
              date={next.date}
              meta={new Date(next.date).toLocaleDateString(undefined, {
                weekday: "short",
                day: "2-digit",
                month: "short",
              })}
            />
          ) : null}

          <div className="animate-rise mt-4 rounded-3xl p-4 glass">
            <div className="eyebrow">Announcements</div>
            <div className="mt-3 space-y-3">
              {announcements.map((a) => (
                <div key={a.id}>
                  <div className="text-[13px] font-semibold">{a.title}</div>
                  <p className="text-[12px] text-muted-foreground">{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {featured ? (
          <PollCard poll={featured} />
        ) : (
          <div className="animate-rise mt-4 rounded-3xl p-4 text-[12px] text-muted-foreground glass">
            {loading
              ? "Loading decisions…"
              : "No decisions are open right now."}
          </div>
        )}
      </div>

      <SectionHeader title="Upcoming events" to="/events" action="all events" />
      {upcoming.length === 0 ? (
        <p className="mt-3 text-[12px] text-muted-foreground">
          {eventsQuery.isLoading
            ? "Loading events…"
            : "No upcoming events yet."}
        </p>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {upcoming.slice(0, 2).map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}

      <SectionHeader title="Latest ideas" to="/ideas" action="+ post" />
      {ideas.length === 0 ? (
        <p className="mt-3 text-[12px] text-muted-foreground">
          {ideasQuery.isLoading
            ? "Loading ideas…"
            : "No ideas posted yet — be first."}
        </p>
      ) : (
        <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
          {ideas.slice(0, 2).map((i) => (
            <IdeaCard key={i.id} idea={i} compact />
          ))}
        </div>
      )}

      <SectionHeader title="Memories" to="/memories" action="see all" />
      <MemoryGrid items={memories} />
    </Shell>
  );
}

function SectionHeader({
  title,
  to,
  action,
}: {
  title: string;
  to: "/events" | "/ideas" | "/memories";
  action: string;
}) {
  return (
    <div className="animate-rise mt-6 flex items-center justify-between">
      <div className="eyebrow">{title}</div>
      <Link to={to} className="font-mono text-[10px] text-accent">
        {action}
      </Link>
    </div>
  );
}
