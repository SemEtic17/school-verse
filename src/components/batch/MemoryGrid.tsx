import type { Memory } from "@/data/batch";

export function MemoryGrid({
  items,
  withCaptions = false,
}: {
  items: Memory[];
  withCaptions?: boolean;
}) {
  return (
    <div className="animate-rise mt-3 grid grid-cols-3 gap-2">
      {items.map((m) => (
        <figure
          key={m.id}
          className={`group relative overflow-hidden rounded-2xl ring-1 ring-inset ring-border ${
            m.span ? "col-span-2 row-span-2" : ""
          }`}
        >
          <img
            src={m.image}
            alt={m.caption}
            loading="lazy"
            width={1088}
            height={1088}
            className="aspect-square size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {withCaptions ? (
            <figcaption className="absolute inset-x-0 bottom-0 bg-well p-2 backdrop-blur-md">
              <div className="truncate text-[11px] font-medium">{m.caption}</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                {m.event} · {m.date}
              </div>
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
