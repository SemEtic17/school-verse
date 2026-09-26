import { Link } from "@tanstack/react-router";
import type { BatchEvent } from "@/data/batch";
import { CountdownPills } from "./Countdown";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

export function EventCard({ event }: { event: BatchEvent }) {
  return (
    <div className="animate-rise overflow-hidden rounded-3xl glass transition-transform duration-200 hover:-translate-y-0.5">
      {event.image ? (
        <img
          src={event.image}
          alt={event.name}
          loading="lazy"
          width={816}
          height={816}
          className="h-40 w-full object-cover"
        />
      ) : null}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl leading-none">{event.name}</h3>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {fmt(event.date)}
              {event.location ? ` · ${event.location}` : ""}
            </div>
          </div>
          {event.past ? (
            <span className="shrink-0 rounded-full bg-secondary px-2 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Past
            </span>
          ) : (
            <CountdownPills date={event.date} />
          )}
        </div>

        {event.description ? (
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        ) : null}

        {event.planning ? (
          <div className="mt-3 rounded-2xl bg-well p-3 ring-1 ring-inset ring-border">
            <div className="eyebrow">What we're planning</div>
            <p className="mt-1 text-[12px]">{event.planning}</p>
          </div>
        ) : null}

        <div
          className={`mt-3 flex items-center ${event.participation ? "justify-between" : "justify-end"}`}
        >
          {event.participation ? (
            <span className="text-[11px] text-muted-foreground">
              {event.participation}
            </span>
          ) : null}
          {!event.past ? (
            <Link
              to="/decisions"
              className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-accent-foreground"
            >
              Vote now
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
