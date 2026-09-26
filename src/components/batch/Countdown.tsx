import { useEffect, useState } from "react";

function diff(target: string) {
  const ms = Math.max(0, new Date(target).getTime() - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function useCountdown(target: string) {
  const [time, setTime] = useState(() => diff(target));
  useEffect(() => {
    setTime(diff(target));
    const id = setInterval(() => setTime(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);
  return time;
}

export function CountdownCard({
  label,
  date,
  meta,
}: {
  label: string;
  date: string;
  meta: string;
}) {
  const t = useCountdown(date);

  return (
    <div className="animate-rise mt-6 rounded-3xl p-5 glass">
      <div className="flex items-center justify-between">
        <div className="eyebrow">{label}</div>
        <div className="font-mono text-[10px] text-accent">{meta}</div>
      </div>
      <div className="mt-3 flex items-baseline gap-4">
        <div className="font-display text-[68px] leading-[0.8]">{pad(t.days)}</div>
        <div className="text-[11px] leading-tight text-muted-foreground">
          days
          <br />
          to go
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        {[
          { v: t.hours, l: "hrs" },
          { v: t.minutes, l: "min" },
          { v: t.seconds, l: "sec" },
        ].map((unit) => (
          <div
            key={unit.l}
            className="flex-1 rounded-2xl bg-well py-2 text-center ring-1 ring-inset ring-border"
          >
            <div className="font-display text-2xl">{pad(unit.v)}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              {unit.l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CountdownPills({ date }: { date: string }) {
  const t = useCountdown(date);
  return (
    <div className="flex gap-1.5">
      {[
        { v: t.days, l: "d" },
        { v: t.hours, l: "h" },
        { v: t.minutes, l: "m" },
      ].map((u) => (
        <span
          key={u.l}
          className="rounded-lg bg-well px-2 py-1 font-mono text-[11px] text-foreground ring-1 ring-inset ring-border"
        >
          {pad(u.v)}
          <span className="text-muted-foreground">{u.l}</span>
        </span>
      ))}
    </div>
  );
}
