/**
 * Static branding config + the view types the UI renders.
 *
 * Live data (events, polls, ideas, memories, clothes) is fetched from Supabase
 * by the hooks in `src/hooks/use-batch-data.ts`; nothing here is mock content.
 */

import hoodieMonogram from "@/assets/hoodie-monogram.jpg";
import hoodieYearBlock from "@/assets/hoodie-yearblock.jpg";
import memory1 from "@/assets/memory-1.jpg";
import memory2 from "@/assets/memory-2.jpg";

/** Fallback artwork used when a row has no `image_url` yet. */
export const fallbackImages = {
  monogram: hoodieMonogram,
  yearBlock: hoodieYearBlock,
  memory1,
  memory2,
};

export const batch = {
  name: "Northgate High",
  shortName: "Northgate",
  year: 2027,
  tagline: "Our year. Our decisions. Our memories.",
  welcome:
    "The decisions are yours. Vote on what we wear, what we do, and what we remember — before the doors close.",
};

export type PulseItem = { label: string; live?: boolean | undefined };

export type Announcement = { id: string; title: string; body: string };

/** Editorial announcements — batch notices that aren't tied to an event row. */
export const announcements: Announcement[] = [
  {
    id: "a1",
    title: "Jersey orders close Friday",
    body: "Sizes lock in at 5PM — vote and confirm your size before then.",
  },
  {
    id: "a2",
    title: "Culture Day committee needs 4 more",
    body: "Sign up at the Events page if you want in on planning.",
  },
];

export type BatchEvent = {
  id: string;
  name: string;
  date: string; // ISO
  location?: string | undefined;
  description?: string | undefined;
  planning?: string | undefined;
  participation?: string | undefined;
  image?: string | undefined;
  pollId?: string | undefined;
  past?: boolean | undefined;
};

export type PollOption = {
  id: string;
  label: string;
  votes: number;
  image?: string | undefined;
};

export type PollSuggestion = { id: string; author: string; text: string };

export type Poll = {
  id: string;
  title: string;
  question: string;
  category?: string | undefined;
  closesIn?: string | undefined;
  closesAt?: string | null | undefined;
  eventId?: string | undefined;
  options: PollOption[];
  suggestions: PollSuggestion[];
  /** Option the signed-in user has already voted for, if any. */
  myOptionId?: string | undefined;
};

export type ClothingItem = {
  id: string;
  name: string;
  detail: string;
  image: string;
  votes: number;
};

export type Idea = {
  id: string;
  title: string;
  body: string;
  category: string;
  author: string;
  agree: number;
  replies?: number | undefined;
  upvoted?: boolean | undefined;
};

export const ideaCategories = ["All", "Events", "Clothes", "Memories", "Fun"];

export type Memory = {
  id: string;
  caption: string;
  event: string;
  date: string;
  image: string;
  span?: boolean | undefined;
};

export const totalVotes = (poll: Poll) =>
  poll.options.reduce((sum, o) => sum + o.votes, 0);
