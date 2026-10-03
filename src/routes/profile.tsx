import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Camera,
  Check,
  ImagePlus,
  LogOut,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

import { PageTitle, Shell } from "@/components/batch/Shell";
import { useAuth } from "@/hooks/use-auth";
import { useRemoveAvatar, useUpdateAvatar } from "@/hooks/use-batch-data";

const title = "Your profile — SchoolVerse";
const description =
  "Update your batch profile picture and see the details tied to your account.";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ProfilePage,
});

const roleLabels: Record<string, string> = {
  student: "Student",
  rep: "Class rep",
  admin: "Admin",
};

type Notice = { kind: "success" | "error"; text: string } | null;

function ProfilePage() {
  const { user, profile, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return (
      <Shell>
        <PageTitle eyebrow="Your profile" title="Loading your account." />
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <PageTitle
          eyebrow="Your profile"
          title="Sign in to make it yours."
          blurb="Your name, photo, and batch details live on your profile. Continue with Google to set them up."
        />
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          className="mt-6 w-full rounded-2xl bg-accent px-4 py-3.5 text-[13px] font-bold text-accent-foreground transition-transform active:scale-[0.99]"
        >
          Continue with Google
        </button>
      </Shell>
    );
  }

  const displayName = profile?.full_name ?? user.email ?? "Batch member";
  const role = profile?.role
    ? (roleLabels[profile.role] ?? profile.role)
    : null;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <Shell>
      <PageTitle
        eyebrow="Your profile"
        title="Show the batch who you are."
        blurb="Your photo appears next to your ideas, chat messages, and event RSVPs."
      />

      <AvatarCard
        initial={initial}
        avatarUrl={profile?.avatar_url ?? null}
        displayName={displayName}
      />

      <section className="animate-rise mt-4 rounded-3xl p-5 glass">
        <div className="eyebrow">Account details</div>
        <dl className="mt-4 space-y-3.5">
          <DetailRow label="Name" value={profile?.full_name ?? "Not set"} />
          <DetailRow label="Email" value={user.email ?? "—"} />
          <DetailRow
            label="Role"
            value={
              role ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent ring-1 ring-inset ring-accent/25">
                  <ShieldCheck size={12} aria-hidden />
                  {role}
                </span>
              ) : (
                "—"
              )
            }
          />
          <DetailRow
            label="Class section"
            value={profile?.class_section ?? "Not set"}
          />
          <DetailRow
            label="Student ID"
            value={profile?.student_id ?? "Not set"}
          />
        </dl>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Name, section, and student ID are managed by your class reps. Ask one
          of them if something needs changing.
        </p>
      </section>

      <section className="animate-rise mt-4 rounded-3xl p-5 glass">
        <div className="eyebrow">Session</div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          Signed in as {user.email ?? "your Google account"}.
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold text-destructive ring-1 ring-inset ring-destructive/30 transition-colors hover:bg-destructive/10"
        >
          <LogOut size={15} aria-hidden />
          Sign out
        </button>
      </section>

      <Link
        to="/"
        className="animate-rise mt-4 block rounded-2xl px-4 py-3 text-center text-[12px] font-semibold text-muted-foreground glass transition-colors hover:text-foreground"
      >
        Back to home
      </Link>
    </Shell>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-[11px] font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right text-[13px] font-semibold">
        {value}
      </dd>
    </div>
  );
}

function AvatarCard({
  initial,
  avatarUrl,
  displayName,
}: {
  initial: string;
  avatarUrl: string | null;
  displayName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const updateAvatar = useUpdateAvatar();
  const removeAvatar = useRemoveAvatar();
  const [preview, setPreview] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  // Revoke the local object URL once it's no longer displayed.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const shownImage = preview ?? avatarUrl;
  const pending = updateAvatar.isPending || removeAvatar.isPending;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setNotice(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    try {
      await updateAvatar.mutateAsync(file);
      setNotice({ kind: "success", text: "Profile picture updated." });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Couldn't update your picture. Try again.",
      });
    } finally {
      setPreview(null);
    }
  }

  async function handleRemove() {
    setNotice(null);
    try {
      await removeAvatar.mutateAsync();
      setNotice({ kind: "success", text: "Profile picture removed." });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Couldn't remove your picture. Try again.",
      });
    }
  }

  return (
    <section className="animate-rise mt-6 overflow-hidden rounded-3xl p-5 glass">
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          aria-label="Change profile picture"
          className="group relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full text-[32px] font-semibold ring-1 ring-inset ring-border disabled:opacity-70"
        >
          {shownImage ? (
            <img
              src={shownImage}
              alt=""
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="font-display text-[34px] leading-none text-accent">
              {initial}
            </span>
          )}
          <span className="absolute inset-0 grid place-items-center bg-background/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            {pending ? (
              <span className="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            ) : (
              <Camera size={22} className="text-foreground" aria-hidden />
            )}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="eyebrow">Profile picture</div>
          <p className="mt-1 truncate font-display text-[20px] leading-tight">
            {displayName}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-[12px] font-bold text-accent-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {avatarUrl ? (
                <ImagePlus size={14} aria-hidden />
              ) : (
                <Sparkles size={14} aria-hidden />
              )}
              {pending
                ? "Uploading…"
                : avatarUrl
                  ? "Replace photo"
                  : "Upload photo"}
            </button>
            {avatarUrl ? (
              <button
                type="button"
                onClick={() => void handleRemove()}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold text-muted-foreground ring-1 ring-inset ring-border transition-colors hover:text-destructive disabled:opacity-60"
              >
                <Trash2 size={13} aria-hidden />
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => void handleFile(event)}
        className="sr-only"
        tabIndex={-1}
      />

      <p className="mt-4 text-[10px] text-muted-foreground">
        JPEG, PNG, or WebP · up to 5 MB · square photos look best.
      </p>

      {notice ? (
        <p
          role="status"
          className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] ${
            notice.kind === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-accent/10 text-accent"
          }`}
        >
          {notice.kind === "success" ? <Check size={14} aria-hidden /> : null}
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}
