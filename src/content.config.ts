import { defineCollection  } from 'astro:content';
import { z } from "astro/zod"
import { glob } from 'astro/loaders';

const stories = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/stories" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(['ongoing', 'complete', 'hiatus']),
    startDate: z.date(),
    coverImage: z.string().optional(),
    state: z.enum(['unpublished', 'published', 'unlisted']).default('unpublished'),
  }),
});

const chapters = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/chapters" }),
  schema: z.object({
    title: z.string(),
    chapterNumber: z.number(),
    storySlug: z.string(),
    publishDate: z.date(),
    summary: z.string().optional(),
    state: z.enum(['unpublished', 'published', 'unlisted']).default('unpublished'),
  }),
});

export const collections = {
  stories,
  chapters,
};
