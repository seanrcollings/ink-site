import { defineCollection, z } from 'astro:content';

const stories = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(['ongoing', 'complete', 'hiatus']),
    startDate: z.date(),
    coverImage: z.string().optional(),
  }),
});

const chapters = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    chapterNumber: z.number(),
    storySlug: z.string(),
    publishDate: z.date(),
    summary: z.string().optional(),
  }),
});

export const collections = {
  stories,
  chapters,
};
