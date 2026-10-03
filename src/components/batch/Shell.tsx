import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LogOut, UserRound } from "lucide-react";
import { batch } from "@/data/batch";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nav = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
  { to: "/decisions", label: "Decide" },
  { to: "/clothes", label: "Clothes" },
  { to: "/ideas", label: "Ideas" },
  { to: "/memories", label: "Memories" },
  { to: "/chat", label: "Chat" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const canManage =
    !!user && (profile?.role === "admin" || profile?.role === "rep");

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -left-24 -top-24 h-[45%] w-[60%] rounded-full bg-ice/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-[38%] h-[40%] w-[55%] rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-[10%] h-[40%] w-[70%] rounded-full bg-glow/20 blur-3xl" />

      <div className="relative mx-auto max-w-[430px] px-4 pb-32 pt-4 lg:max-w-5xl lg:px-8 lg:pb-16">
        <header className="animate-rise flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl font-display text-[15px] glass">
              {String(batch.year).slice(-2)}
            </div>
            <div>
              <div className="eyebrow">{batch.shortName} · Class of</div>
              <div className="font-display text-lg leading-none">
                {batch.year}
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "text-accent glass" }}
              >
                {item.label}
              </Link>
            ))}
            {canManage ? (
              <Link
                to="/manage"
                className="rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-accent glass" }}
              >
                Manage
              </Link>
            ) : null}
          </nav>

          <AccountButton />
        </header>

        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 lg:hidden">
        <div className="mx-auto m-3 flex max-w-[430px] items-center justify-between rounded-3xl px-2 py-2 glass-strong">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-1 flex-col items-center gap-1 py-1"
              activeOptions={{ exact: item.to === "/" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={
                      isActive
                        ? "font-mono text-[10px] uppercase tracking-[0.12em] text-accent"
                        : "font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                    }
                  >
                    {item.label}
                  </span>
                  <span
                    className={`size-1 rounded-full ${isActive ? "bg-accent" : "bg-transparent"}`}
                  />
                </>
              )}
            </Link>
          ))}
          {canManage ? (
            <Link
              to="/manage"
              className="flex flex-1 flex-col items-center gap-1 py-1"
              activeProps={{
                className:
                  "flex flex-1 flex-col items-center gap-1 py-1 text-accent",
              }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                Manage
              </span>
              <span className="size-1 rounded-full bg-transparent" />
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}

function AccountButton() {
  const { user, profile, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return <div className="size-10 rounded-full glass" aria-hidden />;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        className="rounded-full px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground glass"
      >
        Continue with Google
      </button>
    );
  }

  const label = profile?.full_name ?? user.email ?? "?";
  const initial = label.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${label}`}
          title={`Account: ${label}`}
          className="grid size-10 place-items-center overflow-hidden rounded-full text-[13px] font-semibold glass"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            initial
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserRound aria-hidden="true" />
            Your profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PageTitle({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
}) {
  return (
    <div className="animate-rise mt-6">
      <div className="eyebrow">{eyebrow}</div>
      <h1 className="mt-2 text-balance font-display text-[40px] leading-[0.92] lg:text-[56px]">
        {title}
      </h1>
      {blurb ? (
        <p className="mt-3 max-w-[48ch] text-pretty text-[13px] leading-relaxed text-muted-foreground">
          {blurb}
        </p>
      ) : null}
    </div>
  );
}
