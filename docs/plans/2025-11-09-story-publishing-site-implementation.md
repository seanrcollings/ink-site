# Story Publishing Site Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a static story publishing site (ink.seancollings.dev) with Content Collections for managing multiple stories and chapters, including dark mode, reading progress, and bookmarking features.

**Architecture:** Astro 5.x with Content Collections for type-safe content management. Stories and chapters use markdown with frontmatter validation. Static site deployed via GitHub Actions to GitHub Pages with custom domain.

**Tech Stack:** Astro 5.x, TypeScript (strict), Tailwind CSS, Content Collections, GitHub Actions

---

## Task 1: Install Tailwind CSS

**Files:**
- Modify: `astro.config.mjs`
- Modify: `tailwind.config.mjs` (created by integration)
- Modify: `package.json` (updated by integration)

**Step 1: Add Tailwind integration**

Run: `npx astro add tailwind`
Expected: Prompts to install dependencies and configure

Answer "Yes" to all prompts.

**Step 2: Verify Tailwind is configured**

Check that `astro.config.mjs` imports Tailwind:

```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()]
});
```

**Step 3: Configure Tailwind for dark mode**

Edit `tailwind.config.mjs`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

**Step 4: Install Tailwind Typography plugin**

Run: `npm install -D @tailwindcss/typography`
Expected: Package installed

**Step 5: Commit**

```bash
git add astro.config.mjs tailwind.config.mjs package.json package-lock.json
git commit -m "feat: add Tailwind CSS with dark mode and typography plugin"
```

---

## Task 2: Configure Astro for Custom Domain

**Files:**
- Modify: `astro.config.mjs`
- Create: `public/CNAME`

**Step 1: Update Astro config with site URL**

Edit `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://ink.seancollings.dev',
  integrations: [tailwind()]
});
```

**Step 2: Create CNAME file**

Create `public/CNAME`:

```
ink.seancollings.dev
```

**Step 3: Commit**

```bash
git add astro.config.mjs public/CNAME
git commit -m "feat: configure custom domain ink.seancollings.dev"
```

---

## Task 3: Set Up Content Collections Config

**Files:**
- Create: `src/content/config.ts`
- Create: `src/content/stories/.gitkeep`
- Create: `src/content/chapters/.gitkeep`

**Step 1: Create Content Collections config**

Create `src/content/config.ts`:

```typescript
import { defineCollection, z } from 'astro:content';

const stories = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
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
```

**Step 2: Create content directories**

Run: `mkdir -p src/content/stories src/content/chapters`

Create placeholder files:
```bash
touch src/content/stories/.gitkeep
touch src/content/chapters/.gitkeep
```

**Step 3: Build to generate types**

Run: `npm run build`
Expected: Build succeeds, generates `.astro/types.d.ts`

**Step 4: Commit**

```bash
git add src/content/config.ts src/content/stories/.gitkeep src/content/chapters/.gitkeep .astro/types.d.ts
git commit -m "feat: configure Content Collections for stories and chapters"
```

---

## Task 4: Create Example Story and Chapters

**Files:**
- Create: `src/content/stories/example-story.md`
- Create: `src/content/chapters/example-story/chapter-one.md`
- Create: `src/content/chapters/example-story/chapter-two.md`

**Step 1: Create example story**

Create `src/content/stories/example-story.md`:

```markdown
---
title: "Example Story"
slug: "example-story"
description: "A sample story to demonstrate the site structure."
status: "ongoing"
startDate: 2025-11-09
---

This is an example story used for development and testing.
```

**Step 2: Create story chapter folder**

Run: `mkdir -p src/content/chapters/example-story`

**Step 3: Create first chapter**

Create `src/content/chapters/example-story/chapter-one.md`:

```markdown
---
title: "The Beginning"
chapterNumber: 1
storySlug: "example-story"
publishDate: 2025-11-09
summary: "Where it all begins."
---

# Chapter 1: The Beginning

This is the first chapter of the example story. It demonstrates how chapters are structured and rendered.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## A Section

More content here to make the chapter longer for testing scroll and reading progress.

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
```

**Step 4: Create second chapter**

Create `src/content/chapters/example-story/chapter-two.md`:

```markdown
---
title: "The Journey Continues"
chapterNumber: 2
storySlug: "example-story"
publishDate: 2025-11-09
summary: "The adventure continues."
---

# Chapter 2: The Journey Continues

This is the second chapter, demonstrating chapter navigation.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

## Another Section

Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
```

**Step 5: Build to verify Content Collections**

Run: `npm run build`
Expected: Build succeeds with no validation errors

**Step 6: Commit**

```bash
git add src/content/stories/example-story.md src/content/chapters/example-story/
git commit -m "feat: add example story and chapters for development"
```

---

## Task 5: Create Base Layout with Dark Mode

**Files:**
- Modify: `src/layouts/Layout.astro`

**Step 1: Update base layout**

Replace contents of `src/layouts/Layout.astro`:

```astro
---
interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Read stories at ink.seancollings.dev' } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="description" content={description} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
  </head>
  <body class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
    <header class="border-b border-gray-200 dark:border-gray-700">
      <nav class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <a href="/" class="text-xl font-bold hover:text-blue-600 dark:hover:text-blue-400">
          ink
        </a>
        <button
          id="darkModeToggle"
          class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Toggle dark mode"
        >
          <svg id="sunIcon" class="w-5 h-5 hidden dark:block" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
          </svg>
          <svg id="moonIcon" class="w-5 h-5 block dark:hidden" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
          </svg>
        </button>
      </nav>
    </header>

    <main>
      <slot />
    </main>

    <script>
      // Dark mode toggle
      const darkModeToggle = document.getElementById('darkModeToggle');
      const html = document.documentElement;

      // Check for saved preference or system preference
      const savedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        html.classList.add('dark');
      }

      // Toggle dark mode
      darkModeToggle?.addEventListener('click', () => {
        html.classList.toggle('dark');
        localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
      });
    </script>
  </body>
</html>
```

**Step 2: Test dark mode toggle**

Run: `npm run dev`
Visit: `http://localhost:4321`
Expected: Page loads, clicking moon/sun icon toggles dark mode, preference persists on reload

**Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: add dark mode toggle to base layout"
```

---

## Task 6: Create Homepage (Story Library)

**Files:**
- Modify: `src/pages/index.astro`
- Delete: `src/components/Welcome.astro` (no longer needed)

**Step 1: Delete Welcome component**

Run: `rm src/components/Welcome.astro`

**Step 2: Create story library homepage**

Replace `src/pages/index.astro`:

```astro
---
import Layout from '../layouts/Layout.astro';
import { getCollection } from 'astro:content';

// Get all stories
const stories = await getCollection('stories');

// Get all chapters to find latest per story
const allChapters = await getCollection('chapters');

// Build story data with latest chapter info
const storyData = stories.map(story => {
  const storyChapters = allChapters
    .filter(ch => ch.data.storySlug === story.data.slug)
    .sort((a, b) => b.data.chapterNumber - a.data.chapterNumber);

  const latestChapter = storyChapters[0];
  const chapterCount = storyChapters.length;

  return {
    story,
    latestChapter,
    chapterCount,
  };
});
---

<Layout title="ink - Story Library">
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-4xl font-bold mb-8">Story Library</h1>

    {storyData.length === 0 ? (
      <p class="text-gray-600 dark:text-gray-400">No stories yet. Check back soon!</p>
    ) : (
      <div class="space-y-8">
        {storyData.map(({ story, latestChapter, chapterCount }) => (
          <article class="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div class="flex justify-between items-start mb-3">
              <h2 class="text-2xl font-bold">
                <a
                  href={`/${story.data.slug}`}
                  class="hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {story.data.title}
                </a>
              </h2>
              <span class={`px-3 py-1 rounded-full text-sm font-medium ${
                story.data.status === 'complete' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                story.data.status === 'ongoing' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
              }`}>
                {story.data.status}
              </span>
            </div>

            <p class="text-gray-600 dark:text-gray-400 mb-4">
              {story.data.description}
            </p>

            <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-500">
              <span>{chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}</span>
              {latestChapter && (
                <span>
                  Latest: {latestChapter.data.title}
                </span>
              )}
            </div>

            <div class="mt-4">
              <a
                href={`/${story.data.slug}`}
                class="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                View Chapters
              </a>
            </div>
          </article>
        ))}
      </div>
    )}
  </div>
</Layout>
```

**Step 3: Test homepage**

Run: `npm run dev`
Visit: `http://localhost:4321`
Expected: Story library displays with "Example Story", shows 2 chapters, status badge, and "View Chapters" button

**Step 4: Commit**

```bash
git add src/pages/index.astro
git add -u src/components/Welcome.astro
git commit -m "feat: create story library homepage"
```

---

## Task 7: Create Story Page (Chapter List)

**Files:**
- Create: `src/pages/[storySlug]/index.astro`

**Step 1: Create story page directory**

Run: `mkdir -p src/pages/[storySlug]`

**Step 2: Create story page**

Create `src/pages/[storySlug]/index.astro`:

```astro
---
import Layout from '../../layouts/Layout.astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const stories = await getCollection('stories');
  return stories.map(story => ({
    params: { storySlug: story.data.slug },
    props: { story },
  }));
}

const { story } = Astro.props;

// Get chapters for this story
const allChapters = await getCollection('chapters');
const chapters = allChapters
  .filter(ch => ch.data.storySlug === story.data.slug)
  .sort((a, b) => a.data.chapterNumber - b.data.chapterNumber);
---

<Layout title={`${story.data.title} - ink`} description={story.data.description}>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Back to library -->
    <a
      href="/"
      class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-6"
    >
      ← Back to Library
    </a>

    <!-- Story header -->
    <header class="mb-8">
      <div class="flex items-start justify-between mb-4">
        <h1 class="text-4xl font-bold">{story.data.title}</h1>
        <span class={`px-3 py-1 rounded-full text-sm font-medium ${
          story.data.status === 'complete' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
          story.data.status === 'ongoing' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
          'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
        }`}>
          {story.data.status}
        </span>
      </div>

      <p class="text-lg text-gray-600 dark:text-gray-400">
        {story.data.description}
      </p>
    </header>

    <!-- Chapter list -->
    {chapters.length === 0 ? (
      <p class="text-gray-600 dark:text-gray-400 text-center py-12">
        Coming soon! No chapters published yet.
      </p>
    ) : (
      <>
        <div class="mb-6">
          <a
            href={`/${story.data.slug}/${chapters[0].slug}`}
            class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Start Reading
          </a>
        </div>

        <div class="space-y-4">
          <h2 class="text-2xl font-bold mb-4">Chapters ({chapters.length})</h2>
          {chapters.map(chapter => (
            <article class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold mb-1">
                    <a
                      href={`/${story.data.slug}/${chapter.slug}`}
                      class="hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      Chapter {chapter.data.chapterNumber}: {chapter.data.title}
                    </a>
                  </h3>
                  {chapter.data.summary && (
                    <p class="text-gray-600 dark:text-gray-400 text-sm">
                      {chapter.data.summary}
                    </p>
                  )}
                </div>
                <time class="text-sm text-gray-500 ml-4">
                  {chapter.data.publishDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </time>
              </div>
            </article>
          ))}
        </div>
      </>
    )}
  </div>
</Layout>
```

**Step 3: Test story page**

Run: `npm run dev`
Visit: `http://localhost:4321/example-story`
Expected: Story page shows title, description, status, "Start Reading" button, and list of 2 chapters

**Step 4: Commit**

```bash
git add src/pages/[storySlug]/index.astro
git commit -m "feat: create story page with chapter list"
```

---

## Task 8: Create Chapter Reading Page

**Files:**
- Create: `src/pages/[storySlug]/[chapterSlug].astro`

**Step 1: Create chapter page**

Create `src/pages/[storySlug]/[chapterSlug].astro`:

```astro
---
import Layout from '../../layouts/Layout.astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const chapters = await getCollection('chapters');
  return chapters.map(chapter => ({
    params: {
      storySlug: chapter.data.storySlug,
      chapterSlug: chapter.slug
    },
    props: { chapter },
  }));
}

const { chapter } = Astro.props;
const { Content } = await chapter.render();

// Get story info
const stories = await getCollection('stories');
const story = stories.find(s => s.data.slug === chapter.data.storySlug);

// Get all chapters for navigation
const allChapters = await getCollection('chapters');
const storyChapters = allChapters
  .filter(ch => ch.data.storySlug === chapter.data.storySlug)
  .sort((a, b) => a.data.chapterNumber - b.data.chapterNumber);

// Find prev/next chapters
const currentIndex = storyChapters.findIndex(ch => ch.slug === chapter.slug);
const prevChapter = currentIndex > 0 ? storyChapters[currentIndex - 1] : null;
const nextChapter = currentIndex < storyChapters.length - 1 ? storyChapters[currentIndex + 1] : null;

const pageTitle = `${chapter.data.title} - ${story?.data.title} - ink`;
---

<Layout title={pageTitle} description={chapter.data.summary}>
  <!-- Reading progress bar -->
  <div id="readingProgress" class="fixed top-0 left-0 h-1 bg-blue-600 dark:bg-blue-400 z-50 transition-all" style="width: 0%"></div>

  <div class="max-w-3xl mx-auto px-4 py-8">
    <!-- Navigation header -->
    <nav class="mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
      <a
        href={`/${chapter.data.storySlug}`}
        class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-4"
      >
        ← Back to {story?.data.title}
      </a>

      <div class="flex items-center justify-between">
        {prevChapter ? (
          <a
            href={`/${chapter.data.storySlug}/${prevChapter.slug}`}
            class="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            ← Previous
          </a>
        ) : (
          <div class="w-24"></div>
        )}

        <span class="text-sm text-gray-600 dark:text-gray-400">
          Chapter {chapter.data.chapterNumber}
        </span>

        {nextChapter ? (
          <a
            href={`/${chapter.data.storySlug}/${nextChapter.slug}`}
            class="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Next →
          </a>
        ) : (
          <div class="w-24"></div>
        )}
      </div>
    </nav>

    <!-- Chapter content -->
    <article id="chapterContent" class="prose prose-lg dark:prose-invert max-w-none">
      <Content />
    </article>

    <!-- Navigation footer -->
    <nav class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        {prevChapter ? (
          <a
            href={`/${chapter.data.storySlug}/${prevChapter.slug}`}
            class="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            ← Previous: {prevChapter.data.title}
          </a>
        ) : (
          <div></div>
        )}

        {nextChapter ? (
          <a
            href={`/${chapter.data.storySlug}/${nextChapter.slug}`}
            class="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Next: {nextChapter.data.title} →
          </a>
        ) : (
          <div></div>
        )}
      </div>
    </nav>
  </div>

  <script define:vars={{ storySlug: chapter.data.storySlug, chapterSlug: chapter.slug }}>
    // Reading progress indicator
    const progressBar = document.getElementById('readingProgress');
    const chapterContent = document.getElementById('chapterContent');

    function updateReadingProgress() {
      if (!progressBar || !chapterContent) return;

      const contentTop = chapterContent.offsetTop;
      const contentHeight = chapterContent.offsetHeight;
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;

      const scrollStart = contentTop;
      const scrollEnd = contentTop + contentHeight - windowHeight;

      if (scrollPosition < scrollStart) {
        progressBar.style.width = '0%';
      } else if (scrollPosition > scrollEnd) {
        progressBar.style.width = '100%';
      } else {
        const progress = ((scrollPosition - scrollStart) / (scrollEnd - scrollStart)) * 100;
        progressBar.style.width = `${progress}%`;
      }
    }

    window.addEventListener('scroll', updateReadingProgress);
    window.addEventListener('resize', updateReadingProgress);
    updateReadingProgress();

    // Bookmarking
    const bookmarkKey = `bookmark-${storySlug}-${chapterSlug}`;

    // Save scroll position periodically
    let saveTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        localStorage.setItem(bookmarkKey, scrollPercent.toString());
      }, 500);
    });

    // Restore scroll position on load
    const savedPosition = localStorage.getItem(bookmarkKey);
    if (savedPosition && parseFloat(savedPosition) > 5) {
      const scrollPosition = (parseFloat(savedPosition) / 100) * (document.documentElement.scrollHeight - window.innerHeight);

      // Show prompt
      const shouldRestore = confirm('Continue where you left off?');
      if (shouldRestore) {
        window.scrollTo(0, scrollPosition);
      }
    }
  </script>
</Layout>
```

**Step 2: Test chapter page**

Run: `npm run dev`
Visit: `http://localhost:4321/example-story/chapter-one`
Expected:
- Chapter content renders with prose styling
- Progress bar at top updates on scroll
- Previous button disabled (first chapter)
- Next button links to chapter 2
- Dark mode works

**Step 3: Test bookmarking**

1. Scroll halfway down chapter
2. Refresh page
3. Expected: Prompt "Continue where you left off?"
4. Click OK, page scrolls to saved position

**Step 4: Commit**

```bash
git add src/pages/[storySlug]/[chapterSlug].astro
git commit -m "feat: create chapter reading page with progress and bookmarking"
```

---

## Task 9: Create 404 Page

**Files:**
- Create: `src/pages/404.astro`

**Step 1: Create 404 page**

Create `src/pages/404.astro`:

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Page Not Found - ink">
  <div class="max-w-4xl mx-auto px-4 py-16 text-center">
    <h1 class="text-6xl font-bold mb-4">404</h1>
    <p class="text-2xl text-gray-600 dark:text-gray-400 mb-8">
      Page not found
    </p>
    <p class="text-gray-600 dark:text-gray-400 mb-8">
      The page you're looking for doesn't exist or has been moved.
    </p>
    <a
      href="/"
      class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
    >
      Back to Story Library
    </a>
  </div>
</Layout>
```

**Step 2: Test 404 page**

Run: `npm run dev`
Visit: `http://localhost:4321/nonexistent-page`
Expected: Custom 404 page displays with link back to homepage

**Step 3: Commit**

```bash
git add src/pages/404.astro
git commit -m "feat: create custom 404 page"
```

---

## Task 10: Create GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Create workflow directory**

Run: `mkdir -p .github/workflows`

**Step 2: Create deployment workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions deployment workflow"
```

**Step 4: Verify workflow syntax**

Run: `cat .github/workflows/deploy.yml`
Expected: File contents display correctly with proper YAML formatting

---

## Task 11: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md with implementation details**

Add to end of `CLAUDE.md`:

```markdown

## Content Management

**Adding a new story:**
1. Create `src/content/stories/{story-slug}.md` with required frontmatter
2. Create `src/content/chapters/{story-slug}/` directory
3. Add chapter files with required frontmatter

**Adding a chapter:**
1. Create markdown file in `src/content/chapters/{story-slug}/{chapter-slug}.md`
2. Required frontmatter: title, chapterNumber, storySlug, publishDate
3. Optional: summary
4. Chapter slug (filename) becomes part of URL

**Frontmatter format:**

Story:
```yaml
---
title: "Story Title"
slug: "story-slug"
description: "Story description"
status: "ongoing" | "complete" | "hiatus"
startDate: YYYY-MM-DD
coverImage: "/path/to/image.jpg" # optional
---
```

Chapter:
```yaml
---
title: "Chapter Title"
chapterNumber: 1
storySlug: "story-slug"
publishDate: YYYY-MM-DD
summary: "Chapter summary" # optional
---
```

## Features

**Dark Mode:** Toggle in header, preference saved to localStorage

**Reading Progress:** Progress bar at top shows position in chapter

**Bookmarking:** Scroll position auto-saved, prompt to restore on return

**Navigation:** Homepage → Story page → Chapter page with prev/next links

## Deployment

Automatic deployment via GitHub Actions on push to `main`:
- Builds static site
- Deploys to GitHub Pages
- Live at https://ink.seancollings.dev

Manual preview: `npm run preview` after `npm run build`
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with content management details"
```

---

## Task 12: Update README

**Files:**
- Modify: `README.md`

**Step 1: Replace README with project info**

Replace `README.md` contents:

```markdown
# ink.seancollings.dev

A static story publishing site built with Astro. Host multiple stories with chapters, written in markdown and deployed via GitHub Actions.

## Features

- 📚 Multi-story support with Content Collections
- 📖 Chapter reading with prev/next navigation
- 🌙 Dark mode toggle with localStorage persistence
- 📊 Reading progress indicator
- 🔖 Auto-bookmark scroll position
- 🚀 Auto-deploy to GitHub Pages on push

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at localhost:4321
npm run build        # Build for production
npm run preview      # Preview production build
```

## Adding Content

See `CLAUDE.md` for detailed content management instructions.

### Quick Start

1. Create story: `src/content/stories/my-story.md`
2. Add frontmatter (title, slug, description, status, startDate)
3. Create chapter folder: `src/content/chapters/my-story/`
4. Add chapters with frontmatter (title, chapterNumber, storySlug, publishDate)
5. Commit and push to deploy

## Tech Stack

- Astro 5.x
- TypeScript (strict mode)
- Tailwind CSS with Typography plugin
- Content Collections for type-safe content
- GitHub Actions for CI/CD
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with project information"
```

---

## Task 13: Build and Verify

**Step 1: Clean build**

Run: `npm run build`
Expected: Build succeeds with no errors, outputs to `./dist/`

**Step 2: Preview production build**

Run: `npm run preview`
Expected: Server starts, site accessible at provided URL

**Step 3: Manual testing checklist**

Test the following:
- [ ] Homepage loads and shows example story
- [ ] Story page shows 2 chapters
- [ ] Chapter 1 renders with content
- [ ] Next button goes to chapter 2
- [ ] Chapter 2 Previous button goes to chapter 1
- [ ] Dark mode toggle works on all pages
- [ ] Reading progress bar updates on scroll
- [ ] Bookmark prompt appears on refresh after scrolling
- [ ] 404 page displays for invalid URLs
- [ ] All navigation links work correctly

**Step 4: Check build output**

Run: `ls -la dist/`
Expected: `CNAME` file present in dist root

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final verification and cleanup"
```

---

## Deployment Steps

**After implementation is complete:**

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: GitHub Actions
   - Wait for workflow to complete (~2-3 minutes)

3. **Configure DNS:**
   - Add CNAME record: `ink.seancollings.dev` → `[username].github.io`
   - Wait for DNS propagation

4. **Verify deployment:**
   - Visit https://ink.seancollings.dev
   - Check all features work in production

---

## Success Criteria

- ✅ Site builds without errors
- ✅ All pages render correctly (homepage, story, chapter, 404)
- ✅ Content Collections validate frontmatter
- ✅ Dark mode works and persists
- ✅ Reading progress bar functions
- ✅ Bookmarking saves and restores position
- ✅ Navigation (prev/next) works correctly
- ✅ GitHub Actions workflow configured
- ✅ CNAME file present for custom domain
- ✅ Documentation updated (CLAUDE.md, README.md)
