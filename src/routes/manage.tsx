import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { PageTitle, Shell } from "@/components/batch/Shell";
import { useAuth } from "@/hooks/use-auth";
import { queryKeys } from "@/hooks/use-batch-data";
import { supabase } from "@/integrations/supabase/client";

const title = "Manage batch content — SchoolVerse";
const bucket = "schoolverse-media";
const inputClass =
  "w-full rounded-xl bg-well px-3 py-2.5 text-[13px] outline-none ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-accent/50";
const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 10 * 1024 * 1024;

type Tab = "event" | "clothing" | "memory";
type Notice = { kind: "success" | "error"; text: string };
type UploadedImage = { path: string; url: string };
type ClothingOptionDraft = { label: string; image: File | null };

export const Route = createFileRoute("/manage")({
  head: () => ({ meta: [{ title }] }),
  component: ManagePage,
});

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

async function uploadImage(file: File, userId: string): Promise<UploadedImage> {
  if (!imageTypes.includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > maxImageSize) {
    throw new Error("Images must be 10 MB or smaller.");
  }

  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  return {
    path,
    url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
  };
}

async function removeImages(images: UploadedImage[]) {
  if (images.length === 0) return;
  await supabase.storage.from(bucket).remove(images.map((image) => image.path));
}

function ManagePage() {
  const { user, profile, loading, signInWithGoogle } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("event");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    planning: "",
  });
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [pollForm, setPollForm] = useState({
    title: "",
    question: "",
    closesAt: "",
  });
  const [options, setOptions] = useState<ClothingOptionDraft[]>([
    { label: "", image: null },
    { label: "", image: null },
  ]);
  const [memoryForm, setMemoryForm] = useState({
    title: "",
    category: "",
    date: "",
  });
  const [memoryImage, setMemoryImage] = useState<File | null>(null);

  const isAdmin = profile?.role === "admin" || profile?.role === "rep";

  async function publishEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setPending(true);
    setNotice(null);
    let image: UploadedImage | null = null;
    try {
      if (eventImage) image = await uploadImage(eventImage, user.id);
      const { error } = await supabase.from("events").insert({
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || null,
        event_date: new Date(eventForm.date).toISOString(),
        location: eventForm.location.trim() || null,
        planning_summary: eventForm.planning.trim() || null,
        image_url: image?.url ?? null,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: queryKeys.events });
      setEventForm({
        title: "",
        description: "",
        date: "",
        location: "",
        planning: "",
      });
      setEventImage(null);
      setNotice({ kind: "success", text: "Event published." });
    } catch (error) {
      if (image) await removeImages([image]);
      setNotice({ kind: "error", text: errorText(error) });
    } finally {
      setPending(false);
    }
  }

  async function publishClothingPoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const cleanOptions = options.map((option) => ({
      label: option.label.trim(),
      image: option.image,
    }));
    if (
      cleanOptions.length < 2 ||
      cleanOptions.some((option) => !option.label || !option.image)
    ) {
      setNotice({
        kind: "error",
        text: "Add at least two named designs and choose an image for each.",
      });
      return;
    }

    setPending(true);
    setNotice(null);
    const uploaded: UploadedImage[] = [];
    let pollId: string | null = null;
    try {
      const images: UploadedImage[] = [];
      for (const option of cleanOptions) {
        const image = await uploadImage(option.image as File, user.id);
        images.push(image);
        uploaded.push(image);
      }
      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({
          title: pollForm.title.trim(),
          question: pollForm.question.trim(),
          category: "clothing",
          closes_at: pollForm.closesAt
            ? new Date(pollForm.closesAt).toISOString()
            : null,
        })
        .select("id")
        .single();
      if (pollError) throw pollError;
      pollId = poll.id;

      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(
          cleanOptions.map((option, index) => ({
            poll_id: poll.id,
            option_text: option.label,
            image_url: images[index].url,
          })),
        );
      if (optionsError) throw optionsError;

      await queryClient.invalidateQueries({ queryKey: queryKeys.polls });
      setPollForm({ title: "", question: "", closesAt: "" });
      setOptions([
        { label: "", image: null },
        { label: "", image: null },
      ]);
      setNotice({
        kind: "success",
        text: "Clothing vote published with its designs.",
      });
    } catch (error) {
      if (pollId) {
        await supabase.from("polls").delete().eq("id", pollId);
      }
      await removeImages(uploaded);
      setNotice({ kind: "error", text: errorText(error) });
    } finally {
      setPending(false);
    }
  }

  async function publishMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !memoryImage) return;
    setPending(true);
    setNotice(null);
    let image: UploadedImage | null = null;
    try {
      image = await uploadImage(memoryImage, user.id);
      const { error } = await supabase.from("memories").insert({
        title: memoryForm.title.trim(),
        category: memoryForm.category.trim(),
        event_date: memoryForm.date
          ? new Date(`${memoryForm.date}T12:00:00`).toISOString()
          : null,
        image_url: image.url,
        uploader_id: user.id,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: queryKeys.memories });
      setMemoryForm({ title: "", category: "", date: "" });
      setMemoryImage(null);
      setNotice({ kind: "success", text: "Memory added to the photo wall." });
    } catch (error) {
      if (image) await removeImages([image]);
      setNotice({ kind: "error", text: errorText(error) });
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <PageTitle eyebrow="Batch workspace" title="Loading your account." />
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <PageTitle
          eyebrow="Batch workspace"
          title="Sign in to manage content."
        />
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          className="mt-5 rounded-xl bg-accent px-4 py-3 text-[13px] font-semibold text-accent-foreground"
        >
          Continue with Google
        </button>
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell>
        <PageTitle
          eyebrow="Batch workspace"
          title="Loading your permissions."
        />
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <PageTitle
          eyebrow="Batch workspace"
          title="Publishing is for class reps."
          blurb="Ask the project owner to grant your account the rep role in Supabase."
        />
        <pre className="mt-5 overflow-x-auto rounded-xl p-4 text-[12px] glass">
          <code>{`update public.profiles\nset role = 'rep'\nwhere email = '${user.email ?? "YOUR_GOOGLE_EMAIL"}';`}</code>
        </pre>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          Run this in the Supabase SQL Editor as the project owner. The secure
          content migration must be applied first.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageTitle
        eyebrow={`Publishing · ${profile.role}`}
        title="Put the plan in motion."
        blurb="Publish batch events, clothing votes, and memories for everyone to see."
      />

      <div
        className="mt-6 grid grid-cols-3 gap-1 rounded-xl p-1 glass"
        role="tablist"
        aria-label="Content type"
      >
        <TabButton active={tab === "event"} onClick={() => setTab("event")}>
          Event
        </TabButton>
        <TabButton
          active={tab === "clothing"}
          onClick={() => setTab("clothing")}
        >
          Clothing
        </TabButton>
        <TabButton active={tab === "memory"} onClick={() => setTab("memory")}>
          Memory
        </TabButton>
      </div>

      {notice ? (
        <p
          role="status"
          className={`mt-4 rounded-xl px-3 py-2.5 text-[12px] ${notice.kind === "error" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"}`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-4 rounded-2xl p-4 glass">
        {tab === "event" ? (
          <form
            className="space-y-3"
            onSubmit={(event) => void publishEvent(event)}
          >
            <FormField label="Event name">
              <input
                className={inputClass}
                value={eventForm.title}
                onChange={(event) =>
                  setEventForm({ ...eventForm, title: event.target.value })
                }
                required
                maxLength={100}
                placeholder="Graduation night"
              />
            </FormField>
            <FormField label="Date and time">
              <input
                className={inputClass}
                type="datetime-local"
                value={eventForm.date}
                onChange={(event) =>
                  setEventForm({ ...eventForm, date: event.target.value })
                }
                required
              />
            </FormField>
            <FormField label="Location">
              <input
                className={inputClass}
                value={eventForm.location}
                onChange={(event) =>
                  setEventForm({ ...eventForm, location: event.target.value })
                }
                maxLength={160}
                placeholder="School hall"
              />
            </FormField>
            <FormField label="Description">
              <textarea
                className={inputClass}
                value={eventForm.description}
                onChange={(event) =>
                  setEventForm({
                    ...eventForm,
                    description: event.target.value,
                  })
                }
                rows={3}
                maxLength={1200}
                placeholder="What the batch should know"
              />
            </FormField>
            <FormField label="Planning note">
              <textarea
                className={inputClass}
                value={eventForm.planning}
                onChange={(event) =>
                  setEventForm({ ...eventForm, planning: event.target.value })
                }
                rows={2}
                maxLength={600}
                placeholder="Optional update for attendees"
              />
            </FormField>
            <ImageField
              id="event-image"
              label="Event image (optional)"
              file={eventImage}
              onChange={setEventImage}
            />
            <PublishButton pending={pending} label="Publish event" />
          </form>
        ) : null}

        {tab === "clothing" ? (
          <form
            className="space-y-3"
            onSubmit={(event) => void publishClothingPoll(event)}
          >
            <FormField label="Vote title">
              <input
                className={inputClass}
                value={pollForm.title}
                onChange={(event) =>
                  setPollForm({ ...pollForm, title: event.target.value })
                }
                required
                maxLength={100}
                placeholder="Senior class shirt"
              />
            </FormField>
            <FormField label="Question">
              <input
                className={inputClass}
                value={pollForm.question}
                onChange={(event) =>
                  setPollForm({ ...pollForm, question: event.target.value })
                }
                required
                maxLength={240}
                placeholder="Which design should we order?"
              />
            </FormField>
            <FormField label="Voting closes (optional)">
              <input
                className={inputClass}
                type="datetime-local"
                value={pollForm.closesAt}
                onChange={(event) =>
                  setPollForm({ ...pollForm, closesAt: event.target.value })
                }
              />
            </FormField>
            <div className="space-y-3 pt-1">
              {options.map((option, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-xl p-3 ring-1 ring-inset ring-border"
                >
                  <FormField label={`Design ${index + 1} name`}>
                    <input
                      className={inputClass}
                      value={option.label}
                      onChange={(event) =>
                        setOptions(
                          options.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, label: event.target.value }
                              : item,
                          ),
                        )
                      }
                      required
                      maxLength={80}
                      placeholder="Blue crest"
                    />
                  </FormField>
                  <ImageField
                    id={`clothing-image-${index}`}
                    label="Design image"
                    file={option.image}
                    onChange={(image) =>
                      setOptions(
                        options.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, image } : item,
                        ),
                      )
                    }
                    required
                  />
                  {options.length > 2 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setOptions(
                          options.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="text-[11px] text-muted-foreground underline underline-offset-4"
                    >
                      Remove design
                    </button>
                  ) : null}
                </div>
              ))}
              {options.length < 6 ? (
                <button
                  type="button"
                  onClick={() =>
                    setOptions([...options, { label: "", image: null }])
                  }
                  className="w-full rounded-xl px-3 py-2 text-[12px] text-accent ring-1 ring-inset ring-border"
                >
                  Add another design
                </button>
              ) : null}
            </div>
            <PublishButton pending={pending} label="Publish clothing vote" />
          </form>
        ) : null}

        {tab === "memory" ? (
          <form
            className="space-y-3"
            onSubmit={(event) => void publishMemory(event)}
          >
            <FormField label="Caption">
              <input
                className={inputClass}
                value={memoryForm.title}
                onChange={(event) =>
                  setMemoryForm({ ...memoryForm, title: event.target.value })
                }
                required
                maxLength={100}
                placeholder="One for the yearbook"
              />
            </FormField>
            <FormField label="Event or category">
              <input
                className={inputClass}
                value={memoryForm.category}
                onChange={(event) =>
                  setMemoryForm({ ...memoryForm, category: event.target.value })
                }
                required
                maxLength={80}
                placeholder="Sports day"
              />
            </FormField>
            <FormField label="Date (optional)">
              <input
                className={inputClass}
                type="date"
                value={memoryForm.date}
                onChange={(event) =>
                  setMemoryForm({ ...memoryForm, date: event.target.value })
                }
              />
            </FormField>
            <ImageField
              id="memory-image"
              label="Photo"
              file={memoryImage}
              onChange={setMemoryImage}
              required
            />
            <PublishButton pending={pending} label="Add to memories" />
          </form>
        ) : null}
      </div>
    </Shell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-lg px-2 py-2 text-[12px] font-semibold ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-[11px] font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ImageField({
  id,
  label,
  file,
  onChange,
  required = false,
}: {
  id: string;
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[11px] font-medium text-muted-foreground"
      >
        {label}
      </label>
      <input
        key={file ? `${file.name}-${file.lastModified}` : "empty"}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required={required && !file}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="block w-full text-[11px] text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-[11px] file:font-semibold file:text-foreground"
      />
      <p className="text-[10px] text-muted-foreground">
        {file
          ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`
          : "JPEG, PNG, or WebP · max 10 MB"}
      </p>
    </div>
  );
}

function PublishButton({
  pending,
  label,
}: {
  pending: boolean;
  label: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-accent px-4 py-3 text-[13px] font-bold text-accent-foreground disabled:opacity-60"
    >
      {pending ? "Publishing…" : label}
    </button>
  );
}
