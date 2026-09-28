import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { PageTitle, Shell } from "@/components/batch/Shell";
import { useAuth } from "@/hooks/use-auth";
import {
  queryKeys,
  useClothingPolls,
  useEvents,
  useIdeas,
  useMemories,
} from "@/hooks/use-batch-data";
import { supabase } from "@/integrations/supabase/client";
import type { BatchEvent, Idea, Memory, Poll } from "@/data/batch";

const title = "Manage batch content — SchoolVerse";
const bucket = "schoolverse-media";
const inputClass =
  "w-full rounded-xl bg-well px-3 py-2.5 text-[13px] outline-none ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-accent/50";
const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 10 * 1024 * 1024;

type Tab = "event" | "clothing" | "memory" | "idea";
type Notice = { kind: "success" | "error"; text: string };
type UploadedImage = { path: string; url: string };
type Editing = { tab: Tab; id: string };
type ClothingOptionDraft = {
  id?: string | undefined;
  label: string;
  image: File | null;
  imageUrl?: string | null;
};

export const Route = createFileRoute("/manage")({
  head: () => ({ meta: [{ title }] }),
  component: ManagePage,
});

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function toDateTimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateOnly(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Storage object path for a public bucket URL, so replaced files can be cleaned up. */
function storagePath(url: string | null | undefined) {
  if (!url) return null;
  const marker = `/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

async function removeImageUrls(urls: (string | null | undefined)[]) {
  const paths = urls
    .map(storagePath)
    .filter((path): path is string => Boolean(path));
  if (paths.length === 0) return;
  await supabase.storage.from(bucket).remove(paths);
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
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    planning: "",
  });
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [eventImageUrl, setEventImageUrl] = useState<string | null>(null);

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
  const [memoryImageUrl, setMemoryImageUrl] = useState<string | null>(null);

  const [ideaForm, setIdeaForm] = useState({
    title: "",
    description: "",
    category: "",
  });

  const events = useEvents();
  const clothing = useClothingPolls();
  const memories = useMemories();
  const ideas = useIdeas();

  const isAdmin = profile?.role === "admin" || profile?.role === "rep";

  function resetEventForm() {
    setEventForm({
      title: "",
      description: "",
      date: "",
      location: "",
      planning: "",
    });
    setEventImage(null);
    setEventImageUrl(null);
  }

  function resetClothingForm() {
    setPollForm({ title: "", question: "", closesAt: "" });
    setOptions([
      { label: "", image: null },
      { label: "", image: null },
    ]);
  }

  function resetMemoryForm() {
    setMemoryForm({ title: "", category: "", date: "" });
    setMemoryImage(null);
    setMemoryImageUrl(null);
  }

  function resetIdeaForm() {
    setIdeaForm({ title: "", description: "", category: "" });
  }

  /** Leave edit mode and clear whatever form was loaded with existing values. */
  function endEdit() {
    if (!editing) return;
    if (editing.tab === "event") resetEventForm();
    else if (editing.tab === "clothing") resetClothingForm();
    else if (editing.tab === "memory") resetMemoryForm();
    else resetIdeaForm();
    setEditing(null);
    setConfirmId(null);
  }

  function switchTab(next: Tab) {
    if (editing && editing.tab !== next) endEdit();
    setTab(next);
    setNotice(null);
    setConfirmId(null);
  }

  function startEventEdit(row: BatchEvent) {
    setEditing({ tab: "event", id: row.id });
    setConfirmId(null);
    setNotice(null);
    setEventForm({
      title: row.name,
      description: row.description ?? "",
      date: toDateTimeLocal(row.date),
      location: row.location ?? "",
      planning: row.planning ?? "",
    });
    setEventImage(null);
    setEventImageUrl(row.image ?? null);
  }

  function startClothingEdit(poll: Poll) {
    setEditing({ tab: "clothing", id: poll.id });
    setConfirmId(null);
    setNotice(null);
    setPollForm({
      title: poll.title,
      question: poll.question,
      closesAt: toDateTimeLocal(poll.closesAt ?? null),
    });
    setOptions(
      poll.options.length > 0
        ? poll.options.map((option) => ({
            id: option.id,
            label: option.label,
            image: null,
            imageUrl: option.image ?? null,
          }))
        : [
            { label: "", image: null },
            { label: "", image: null },
          ],
    );
  }

  function startMemoryEdit(row: Memory) {
    setEditing({ tab: "memory", id: row.id });
    setConfirmId(null);
    setNotice(null);
    setMemoryForm({
      title: row.caption,
      category: row.event,
      date: toDateOnly(row.dateISO ?? null),
    });
    setMemoryImage(null);
    setMemoryImageUrl(row.image);
  }

  function startIdeaEdit(row: Idea) {
    setEditing({ tab: "idea", id: row.id });
    setConfirmId(null);
    setNotice(null);
    setIdeaForm({
      title: row.title,
      description: row.body,
      category: row.category,
    });
  }

  async function runAction(action: () => Promise<void>, successText: string) {
    if (pending) return;
    setPending(true);
    setNotice(null);
    try {
      await action();
      setNotice({ kind: "success", text: successText });
    } catch (error) {
      setNotice({ kind: "error", text: errorText(error) });
    } finally {
      setPending(false);
    }
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || pending) return;
    setPending(true);
    setNotice(null);
    const editingEventId = editing?.tab === "event" ? editing.id : null;
    let image: UploadedImage | null = null;
    try {
      const payload = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || null,
        event_date: new Date(eventForm.date).toISOString(),
        location: eventForm.location.trim() || null,
        planning_summary: eventForm.planning.trim() || null,
      };
      if (eventImage) image = await uploadImage(eventImage, user.id);

      if (editingEventId) {
        const { error } = await supabase
          .from("events")
          .update(image ? { ...payload, image_url: image.url } : payload)
          .eq("id", editingEventId);
        if (error) throw error;
        if (image) await removeImageUrls([eventImageUrl]);
      } else {
        const { error } = await supabase
          .from("events")
          .insert({ ...payload, image_url: image?.url ?? null });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.events });
      if (editingEventId) {
        endEdit();
        setNotice({ kind: "success", text: "Event updated." });
      } else {
        resetEventForm();
        setNotice({ kind: "success", text: "Event published." });
      }
    } catch (error) {
      if (image) await removeImages([image]);
      setNotice({ kind: "error", text: errorText(error) });
    } finally {
      setPending(false);
    }
  }

  async function saveClothingPoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || pending) return;
    const drafts = options.map((option) => ({
      ...option,
      label: option.label.trim(),
    }));
    if (
      drafts.length < 2 ||
      drafts.some(
        (option) => !option.label || (!option.image && !option.imageUrl),
      )
    ) {
      setNotice({
        kind: "error",
        text: "Add at least two named designs and give each one an image.",
      });
      return;
    }

    setPending(true);
    setNotice(null);
    const editingPollId = editing?.tab === "clothing" ? editing.id : null;
    const uploaded: UploadedImage[] = [];
    let createdPollId: string | null = null;
    try {
      const pollPayload = {
        title: pollForm.title.trim(),
        question: pollForm.question.trim(),
        category: "clothing",
        closes_at: pollForm.closesAt
          ? new Date(pollForm.closesAt).toISOString()
          : null,
      };

      let pollId: string;
      if (editingPollId) {
        pollId = editingPollId;
        const { error } = await supabase
          .from("polls")
          .update(pollPayload)
          .eq("id", pollId);
        if (error) throw error;
      } else {
        const { data: poll, error } = await supabase
          .from("polls")
          .insert(pollPayload)
          .select("id")
          .single();
        if (error) throw error;
        pollId = poll.id;
        createdPollId = poll.id;
      }

      const rows: {
        id?: string | undefined;
        label: string;
        url: string;
        replaced: string | null;
      }[] = [];
      for (const draft of drafts) {
        let url = draft.imageUrl ?? "";
        let replaced: string | null = null;
        if (draft.image) {
          const image = await uploadImage(draft.image, user.id);
          uploaded.push(image);
          url = image.url;
          replaced = draft.imageUrl ?? null;
        }
        rows.push({ id: draft.id, label: draft.label, url, replaced });
      }

      if (createdPollId) {
        const { error } = await supabase.from("poll_options").insert(
          rows.map((row) => ({
            poll_id: createdPollId as string,
            option_text: row.label,
            image_url: row.url,
          })),
        );
        if (error) throw error;
      } else {
        const keptIds = new Set<string>();
        for (const row of rows) {
          if (row.id) {
            keptIds.add(row.id);
            const { error } = await supabase
              .from("poll_options")
              .update({ option_text: row.label, image_url: row.url })
              .eq("id", row.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from("poll_options").insert({
              poll_id: pollId,
              option_text: row.label,
              image_url: row.url,
            });
            if (error) throw error;
          }
        }

        const previous = clothing.data.find((item) => item.id === pollId);
        const removedIds = (previous?.options ?? [])
          .map((option) => option.id)
          .filter((id) => !keptIds.has(id));
        for (const id of removedIds) {
          const { error } = await supabase
            .from("poll_options")
            .delete()
            .eq("id", id);
          if (error) throw error;
        }
      }

      await removeImageUrls(rows.map((row) => row.replaced));
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls });
      if (createdPollId) {
        resetClothingForm();
        setNotice({
          kind: "success",
          text: "Clothing vote published with its designs.",
        });
      } else {
        endEdit();
        setNotice({ kind: "success", text: "Clothing vote updated." });
      }
    } catch (error) {
      if (createdPollId) {
        await supabase.from("polls").delete().eq("id", createdPollId);
        await removeImages(uploaded);
      }
      setNotice({ kind: "error", text: errorText(error) });
    } finally {
      setPending(false);
    }
  }

  async function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || pending) return;
    const editingMemoryId = editing?.tab === "memory" ? editing.id : null;
    if (!editingMemoryId && !memoryImage) return;

    setPending(true);
    setNotice(null);
    let image: UploadedImage | null = null;
    try {
      if (memoryImage) image = await uploadImage(memoryImage, user.id);
      const payload = {
        title: memoryForm.title.trim(),
        category: memoryForm.category.trim(),
        event_date: memoryForm.date
          ? new Date(`${memoryForm.date}T12:00:00`).toISOString()
          : null,
      };

      if (editingMemoryId) {
        const { error } = await supabase
          .from("memories")
          .update(image ? { ...payload, image_url: image.url } : payload)
          .eq("id", editingMemoryId);
        if (error) throw error;
        if (image) await removeImageUrls([memoryImageUrl]);
      } else {
        const url = image?.url;
        if (!url) throw new Error("Choose a photo for this memory.");
        const { error } = await supabase
          .from("memories")
          .insert({ ...payload, image_url: url, uploader_id: user.id });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.memories });
      if (editingMemoryId) {
        endEdit();
        setNotice({ kind: "success", text: "Memory updated." });
      } else {
        resetMemoryForm();
        setNotice({ kind: "success", text: "Memory added to the photo wall." });
      }
    } catch (error) {
      if (image) await removeImages([image]);
      setNotice({ kind: "error", text: errorText(error) });
    } finally {
      setPending(false);
    }
  }

  async function saveIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const editingIdeaId = editing?.tab === "idea" ? editing.id : null;
    if (!editingIdeaId) return;

    setPending(true);
    setNotice(null);
    try {
      const { error } = await supabase
        .from("ideas")
        .update({
          title: ideaForm.title.trim(),
          description: ideaForm.description.trim(),
          category: ideaForm.category.trim(),
        })
        .eq("id", editingIdeaId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: queryKeys.ideas });
      endEdit();
      setNotice({ kind: "success", text: "Idea updated." });
    } catch (error) {
      setNotice({ kind: "error", text: errorText(error) });
    } finally {
      setPending(false);
    }
  }

  function deleteEvent(row: BatchEvent) {
    setConfirmId(null);
    if (editing?.tab === "event" && editing.id === row.id) endEdit();
    void runAction(async () => {
      const { error } = await supabase.from("events").delete().eq("id", row.id);
      if (error) throw error;
      await removeImageUrls([row.image]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.events });
    }, "Event deleted.");
  }

  function deleteClothing(poll: Poll) {
    setConfirmId(null);
    if (editing?.tab === "clothing" && editing.id === poll.id) endEdit();
    void runAction(async () => {
      const { error } = await supabase.from("polls").delete().eq("id", poll.id);
      if (error) throw error;
      await removeImageUrls(poll.options.map((option) => option.image));
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls });
    }, "Clothing vote deleted.");
  }

  function deleteMemory(row: Memory) {
    setConfirmId(null);
    if (editing?.tab === "memory" && editing.id === row.id) endEdit();
    void runAction(async () => {
      const { error } = await supabase
        .from("memories")
        .delete()
        .eq("id", row.id);
      if (error) throw error;
      await removeImageUrls([row.image]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.memories });
    }, "Memory deleted.");
  }

  function deleteIdea(row: Idea) {
    setConfirmId(null);
    if (editing?.tab === "idea" && editing.id === row.id) endEdit();
    void runAction(async () => {
      const { error } = await supabase.from("ideas").delete().eq("id", row.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: queryKeys.ideas });
    }, "Idea deleted.");
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
        blurb="Publish batch events, clothing votes, and memories — or edit and remove what's already live."
      />

      <div
        className="mt-6 grid grid-cols-4 gap-1 rounded-xl p-1 glass"
        role="tablist"
        aria-label="Content type"
      >
        <TabButton active={tab === "event"} onClick={() => switchTab("event")}>
          Event
        </TabButton>
        <TabButton
          active={tab === "clothing"}
          onClick={() => switchTab("clothing")}
        >
          Clothing
        </TabButton>
        <TabButton
          active={tab === "memory"}
          onClick={() => switchTab("memory")}
        >
          Memory
        </TabButton>
        <TabButton active={tab === "idea"} onClick={() => switchTab("idea")}>
          Idea
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
          <>
            {editing?.tab === "event" ? (
              <EditBanner onCancel={endEdit} />
            ) : null}
            <form
              className="space-y-3"
              onSubmit={(event) => void saveEvent(event)}
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
                    setEventForm({
                      ...eventForm,
                      planning: event.target.value,
                    })
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
                currentUrl={eventImageUrl}
              />
              <PublishButton
                pending={pending}
                label={
                  editing?.tab === "event" ? "Save changes" : "Publish event"
                }
                pendingLabel={
                  editing?.tab === "event" ? "Saving…" : "Publishing…"
                }
              />
            </form>

            <SectionHeading>Existing events</SectionHeading>
            <ExistingList
              loading={events.isLoading}
              empty={(events.data ?? []).length === 0}
            >
              {(events.data ?? []).map((row) => (
                <ManagedRow
                  key={row.id}
                  image={row.image}
                  title={row.name}
                  meta={`${formatDateTime(row.date)}${row.location ? ` · ${row.location}` : ""}`}
                  active={editing?.tab === "event" && editing.id === row.id}
                  confirming={confirmId === row.id}
                  onEdit={() => startEventEdit(row)}
                  onAskDelete={() => setConfirmId(row.id)}
                  onConfirmDelete={() => deleteEvent(row)}
                  onCancel={() => setConfirmId(null)}
                />
              ))}
            </ExistingList>
          </>
        ) : null}

        {tab === "clothing" ? (
          <>
            {editing?.tab === "clothing" ? (
              <EditBanner onCancel={endEdit} />
            ) : null}
            <form
              className="space-y-3"
              onSubmit={(event) => void saveClothingPoll(event)}
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
                    key={option.id ?? `new-${index}`}
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
                      currentUrl={option.imageUrl ?? null}
                    />
                    {options.length > 2 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setOptions(
                            options.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
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
                      setOptions([
                        ...options,
                        { label: "", image: null, imageUrl: null },
                      ])
                    }
                    className="w-full rounded-xl px-3 py-2 text-[12px] text-accent ring-1 ring-inset ring-border"
                  >
                    Add another design
                  </button>
                ) : null}
              </div>
              <PublishButton
                pending={pending}
                label={
                  editing?.tab === "clothing"
                    ? "Save changes"
                    : "Publish clothing vote"
                }
                pendingLabel={
                  editing?.tab === "clothing" ? "Saving…" : "Publishing…"
                }
              />
            </form>

            <SectionHeading>Existing clothing votes</SectionHeading>
            <ExistingList
              loading={clothing.isLoading}
              empty={clothing.data.length === 0}
            >
              {clothing.data.map((poll) => (
                <ManagedRow
                  key={poll.id}
                  image={poll.options[0]?.image}
                  title={poll.title}
                  meta={`${poll.options.length} ${
                    poll.options.length === 1 ? "design" : "designs"
                  }${poll.closesIn ? ` · ${poll.closesIn}` : ""}`}
                  active={editing?.tab === "clothing" && editing.id === poll.id}
                  confirming={confirmId === poll.id}
                  onEdit={() => startClothingEdit(poll)}
                  onAskDelete={() => setConfirmId(poll.id)}
                  onConfirmDelete={() => deleteClothing(poll)}
                  onCancel={() => setConfirmId(null)}
                />
              ))}
            </ExistingList>
          </>
        ) : null}

        {tab === "memory" ? (
          <>
            {editing?.tab === "memory" ? (
              <EditBanner onCancel={endEdit} />
            ) : null}
            <form
              className="space-y-3"
              onSubmit={(event) => void saveMemory(event)}
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
                    setMemoryForm({
                      ...memoryForm,
                      category: event.target.value,
                    })
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
                currentUrl={memoryImageUrl}
              />
              <PublishButton
                pending={pending}
                label={
                  editing?.tab === "memory" ? "Save changes" : "Add to memories"
                }
                pendingLabel={
                  editing?.tab === "memory" ? "Saving…" : "Publishing…"
                }
              />
            </form>

            <SectionHeading>Existing memories</SectionHeading>
            <ExistingList
              loading={memories.isLoading}
              empty={(memories.data ?? []).length === 0}
            >
              {(memories.data ?? []).map((row) => (
                <ManagedRow
                  key={row.id}
                  image={row.image}
                  title={row.caption}
                  meta={`${row.event} · ${row.date}`}
                  active={editing?.tab === "memory" && editing.id === row.id}
                  confirming={confirmId === row.id}
                  onEdit={() => startMemoryEdit(row)}
                  onAskDelete={() => setConfirmId(row.id)}
                  onConfirmDelete={() => deleteMemory(row)}
                  onCancel={() => setConfirmId(null)}
                />
              ))}
            </ExistingList>
          </>
        ) : null}

        {tab === "idea" ? (
          <>
            {editing?.tab === "idea" ? (
              <>
                <EditBanner onCancel={endEdit} />
                <form
                  className="space-y-3"
                  onSubmit={(event) => void saveIdea(event)}
                >
                  <FormField label="Title">
                    <input
                      className={inputClass}
                      value={ideaForm.title}
                      onChange={(event) =>
                        setIdeaForm({ ...ideaForm, title: event.target.value })
                      }
                      required
                      maxLength={120}
                    />
                  </FormField>
                  <FormField label="Description">
                    <textarea
                      className={inputClass}
                      value={ideaForm.description}
                      onChange={(event) =>
                        setIdeaForm({
                          ...ideaForm,
                          description: event.target.value,
                        })
                      }
                      rows={3}
                      maxLength={1200}
                    />
                  </FormField>
                  <FormField label="Category">
                    <input
                      className={inputClass}
                      value={ideaForm.category}
                      onChange={(event) =>
                        setIdeaForm({
                          ...ideaForm,
                          category: event.target.value,
                        })
                      }
                      required
                      maxLength={40}
                    />
                  </FormField>
                  <PublishButton
                    pending={pending}
                    label="Save changes"
                    pendingLabel="Saving…"
                  />
                </form>
              </>
            ) : (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Ideas are posted by the batch. Pick one below to edit its
                wording or remove it.
              </p>
            )}

            <SectionHeading>Existing ideas</SectionHeading>
            <ExistingList
              loading={ideas.isLoading}
              empty={(ideas.data ?? []).length === 0}
            >
              {(ideas.data ?? []).map((row) => (
                <ManagedRow
                  key={row.id}
                  title={row.title}
                  meta={`${row.author} · ${row.category}`}
                  active={editing?.tab === "idea" && editing.id === row.id}
                  confirming={confirmId === row.id}
                  onEdit={() => startIdeaEdit(row)}
                  onAskDelete={() => setConfirmId(row.id)}
                  onConfirmDelete={() => deleteIdea(row)}
                  onCancel={() => setConfirmId(null)}
                />
              ))}
            </ExistingList>
          </>
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

function EditBanner({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-accent/10 px-3 py-2">
      <span className="text-[11px] font-semibold text-accent">
        Editing existing post
      </span>
      <button
        type="button"
        onClick={onCancel}
        className="text-[11px] font-semibold text-muted-foreground underline underline-offset-4"
      >
        Cancel
      </button>
    </div>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <>
      <div className="mt-5 h-px w-full bg-border" />
      <p className="eyebrow mt-4">{children}</p>
    </>
  );
}

function ExistingList({
  loading,
  empty,
  children,
}: {
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  if (loading) {
    return <p className="mt-2 text-[12px] text-muted-foreground">Loading…</p>;
  }
  if (empty) {
    return (
      <p className="mt-2 text-[12px] text-muted-foreground">
        Nothing here yet.
      </p>
    );
  }
  return <ul className="mt-2 space-y-2">{children}</ul>;
}

function ManagedRow({
  image,
  title,
  meta,
  active,
  confirming,
  onEdit,
  onAskDelete,
  onConfirmDelete,
  onCancel,
}: {
  image?: string | undefined;
  title: string;
  meta: string;
  active: boolean;
  confirming: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl p-2.5 ring-1 ring-inset ${active ? "bg-accent/5 ring-accent/50" : "ring-border"}`}
    >
      {image ? (
        <img
          src={image}
          alt=""
          className="h-11 w-11 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="h-11 w-11 shrink-0 rounded-lg bg-well" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{meta}</p>
      </div>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onConfirmDelete}
            className="rounded-lg bg-destructive/15 px-2.5 py-1.5 text-[11px] font-semibold text-destructive"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-accent ring-1 ring-inset ring-border"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onAskDelete}
            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-destructive"
          >
            Delete
          </button>
        </div>
      )}
    </li>
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
  currentUrl = null,
}: {
  id: string;
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  currentUrl?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[11px] font-medium text-muted-foreground"
      >
        {label}
      </label>
      {currentUrl ? (
        <div className="flex items-center gap-3 rounded-xl p-2 ring-1 ring-inset ring-border">
          <img
            src={currentUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg object-cover"
          />
          <p className="text-[10px] leading-snug text-muted-foreground">
            Current image. Choose a file below to replace it.
          </p>
        </div>
      ) : null}
      <input
        key={file ? `${file.name}-${file.lastModified}` : "empty"}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required={required && !file && !currentUrl}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="block w-full text-[11px] text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-[11px] file:font-semibold file:text-foreground"
      />
      <p className="text-[10px] text-muted-foreground">
        {file
          ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`
          : currentUrl
            ? "Keep the current image or upload a new one."
            : "JPEG, PNG, or WebP · max 10 MB"}
      </p>
    </div>
  );
}

function PublishButton({
  pending,
  label,
  pendingLabel = "Publishing…",
}: {
  pending: boolean;
  label: string;
  pendingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-accent px-4 py-3 text-[13px] font-bold text-accent-foreground disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
