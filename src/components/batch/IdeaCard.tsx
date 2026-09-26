import type { Idea } from "@/data/batch";
import { useToggleIdeaUpvote } from "@/hooks/use-batch-data";
import { useAuth } from "@/hooks/use-auth";

export function IdeaCard({
  idea,
  compact = false,
}: {
  idea: Idea;
  compact?: boolean;
}) {
  const { user, signInWithGoogle } = useAuth();
  const toggleUpvote = useToggleIdeaUpvote();
  const agreed = idea.upvoted ?? false;

  async function handleToggle() {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    await toggleUpvote.mutateAsync({ ideaId: idea.id, upvoted: agreed });
  }

  return (
    <div className="animate-rise rounded-2xl p-3.5 glass">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[13px] font-medium">{idea.title}</div>
        {!compact ? (
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
            {idea.category}
          </span>
        ) : null}
      </div>

      {!compact ? (
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          {idea.body}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">
          <span className="font-semibold text-accent">{idea.agree}</span> agree
          {idea.replies !== undefined ? (
            <>
              {" "}
              · <span>{idea.replies}</span> replies
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void handleToggle()}
          disabled={toggleUpvote.isPending}
          className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-transform duration-150 active:scale-95 disabled:opacity-70 ${
            agreed
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground ring-1 ring-inset ring-border hover:text-foreground"
          }`}
        >
          {agreed ? "Agreed" : "Agree"}
        </button>
      </div>
    </div>
  );
}
