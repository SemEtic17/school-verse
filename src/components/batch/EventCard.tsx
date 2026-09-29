import { Link } from "@tanstack/react-router";
import { CalendarPlus, Check, Users } from "lucide-react";
import type { BatchEvent } from "@/data/batch";
import { useEventRsvps, useToggleEventRsvp } from "@/hooks/use-batch-data";
import { useAuth } from "@/hooks/use-auth";
import { CountdownPills } from "./Countdown";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

export function EventCard({ event }: { event: BatchEvent }) {
  const { user, signInWithGoogle } = useAuth();
  const { data: rsvps } = useEventRsvps(event.id);
  const toggleRsvp = useToggleEventRsvp(event.id);

  async function handleRsvp() {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    await toggleRsvp.mutateAsync(rsvps?.isAttending ?? false);
  }

  function addToCalendar() {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const formatUtc = (date: Date) =>
      date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const escapeIcs = (value: string) =>
      value
        .replace(/\\/g, "\\\\")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;")
        .replace(/\n/g, "\\n");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SchoolVerse//Batch Events//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@schoolverse`,
      `DTSTAMP:${formatUtc(new Date())}`,
      `DTSTART:${formatUtc(start)}`,
      `DTEND:${formatUtc(end)}`,
      `SUMMARY:${escapeIcs(event.name)}`,
      ...(event.description
        ? [`DESCRIPTION:${escapeIcs(event.description)}`]
        : []),
      ...(event.location ? [`LOCATION:${escapeIcs(event.location)}`] : []),
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

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

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex -space-x-2">
              {(rsvps?.attendees ?? []).slice(0, 3).map((attendee) => (
                <span
                  key={attendee.id}
                  title={attendee.name}
                  className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-background bg-secondary text-[9px] font-semibold text-foreground"
                >
                  {attendee.avatarUrl ? (
                    <img
                      src={attendee.avatarUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    attendee.name.charAt(0).toUpperCase()
                  )}
                </span>
              ))}
            </div>
            <span className="truncate text-[11px] text-muted-foreground">
              {rsvps?.count
                ? `${rsvps.count} going${rsvps.count > 3 ? ` · +${rsvps.count - 3}` : ""}`
                : "Be the first to RSVP"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!event.past ? (
              <button
                type="button"
                onClick={() => void handleRsvp()}
                disabled={toggleRsvp.isPending}
                aria-pressed={rsvps?.isAttending ?? false}
                className={`grid size-9 place-items-center rounded-full transition-colors disabled:opacity-60 ${rsvps?.isAttending ? "bg-accent text-accent-foreground" : "bg-well text-muted-foreground ring-1 ring-inset ring-border hover:text-accent"}`}
                title={rsvps?.isAttending ? "Cancel RSVP" : "RSVP to event"}
              >
                {rsvps?.isAttending ? <Check size={16} /> : <Users size={16} />}
              </button>
            ) : null}
            {!event.past ? (
              <button
                type="button"
                onClick={addToCalendar}
                className="grid size-9 place-items-center rounded-full bg-well text-muted-foreground ring-1 ring-inset ring-border transition-colors hover:text-accent"
                title="Add to calendar"
                aria-label={`Add ${event.name} to calendar`}
              >
                <CalendarPlus size={16} />
              </button>
            ) : null}
            {!event.past ? (
              <Link
                to="/decisions"
                className="rounded-full bg-accent px-3 py-2 text-[11px] font-bold text-accent-foreground"
              >
                Vote now
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
