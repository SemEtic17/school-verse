import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Shell } from "@/components/batch/Shell";
import { CountdownCard } from "@/components/batch/Countdown";
import { PollCard } from "@/components/batch/PollCard";
import { IdeaCard } from "@/components/batch/IdeaCard";
import { MemoryGrid } from "@/components/batch/MemoryGrid";
import { EventCard } from "@/components/batch/EventCard";
import {
  announcements,
  batch,
  fallbackImages,
  type PulseItem,
} from "@/data/batch";
import {
  useEvents,
  useIdeas,
  useMemories,
  usePolls,
} from "@/hooks/use-batch-data";
import { useAuth } from "@/hooks/use-auth";

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
  const { profile } = useAuth();
  const announcementsRef = useRef<HTMLDivElement>(null);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
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
  const dailyPoll =
    polls.find((poll) => poll.category === "daily") ??
    polls.find((poll) => poll.category === "general");
  const featured = polls.find((poll) => poll.id !== dailyPoll?.id);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  function scrollAnnouncements(direction: -1 | 1) {
    const element = announcementsRef.current;
    if (!element) return;
    element.scrollBy({
      left: direction * element.clientWidth * 0.86,
      behavior: "smooth",
    });
  }

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

      <div className="animate-rise mt-6 eyebrow">
        {greeting}, {batch.shortName}
      </div>
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
            <>
              <CountdownCard
                label={`${next.name} countdown`}
                date={next.date}
                meta={new Date(next.date).toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })}
              />
              <Link
                to="/events"
                className="mt-2 flex items-center gap-3 overflow-hidden rounded-2xl p-2 glass transition-colors hover:bg-white/5"
              >
                <img
                  src={next.image ?? fallbackImages.memory1}
                  alt=""
                  className="size-16 shrink-0 rounded-xl object-cover"
                  loading="lazy"
                />
                <span className="min-w-0 flex-1">
                  <span className="eyebrow block">Next up</span>
                  <span className="mt-1 block truncate text-[13px] font-semibold">
                    {next.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {next.location ?? "See event details and RSVP"}
                  </span>
                </span>
                <ArrowRight size={16} className="mr-2 shrink-0 text-accent" />
              </Link>
            </>
          ) : null}

          <div className="animate-rise mt-4 rounded-3xl p-4 glass">
            <div className="flex items-center justify-between">
              <div className="eyebrow">Announcements</div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => scrollAnnouncements(-1)}
                  disabled={announcementIndex === 0}
                  aria-label="Previous announcement"
                  className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:text-accent disabled:opacity-30"
                >
                  <ArrowLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollAnnouncements(1)}
                  disabled={announcementIndex >= announcements.length - 1}
                  aria-label="Next announcement"
                  className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:text-accent disabled:opacity-30"
                >
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
            <div
              ref={announcementsRef}
              onScroll={(event) => {
                const node = event.currentTarget;
                setAnnouncementIndex(
                  Math.min(
                    announcements.length - 1,
                    Math.round(node.scrollLeft / (node.clientWidth * 0.86)),
                  ),
                );
              }}
              className="mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth"
              aria-label="Announcements carousel"
            >
              {announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="min-w-[86%] snap-start rounded-2xl bg-well p-3 ring-1 ring-inset ring-border"
                >
                  <div className="text-[13px] font-semibold">
                    {announcement.title}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    {announcement.body}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-1.5">
              {announcements.map((announcement, index) => (
                <span
                  key={announcement.id}
                  className={`h-1 rounded-full transition-all ${index === announcementIndex ? "w-5 bg-accent" : "w-1.5 bg-muted-foreground/40"}`}
                />
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

      <div className="mt-5">
        <div className="eyebrow">Daily question</div>
        {dailyPoll ? (
          <PollCard poll={dailyPoll} />
        ) : (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl p-4 glass">
            <p className="text-[12px] text-muted-foreground">
              No quick question today. Check back soon.
            </p>
            {profile?.role === "admin" || profile?.role === "rep" ? (
              <Link
                to="/manage"
                className="shrink-0 rounded-full bg-accent px-3 py-2 text-[10px] font-bold text-accent-foreground"
              >
                Post one
              </Link>
            ) : null}
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
