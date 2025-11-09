# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Astro-based static site project named "the-pillars-site". It uses Astro 5.15.4+ with TypeScript in strict mode.

## Development Commands

All commands run from the project root:

- `npm run dev` - Start development server at `localhost:4321`
- `npm run build` - Build production site to `./dist/`
- `npm run preview` - Preview production build locally
- `npm run astro ...` - Run Astro CLI commands (e.g., `npm run astro add`, `npm run astro check`)

## Architecture

**Framework**: Astro with file-based routing

**Key Directories**:
- `src/pages/` - File-based routing (`.astro` files become routes)
- `src/layouts/` - Reusable layout components (e.g., `Layout.astro`)
- `src/components/` - Astro components
- `src/assets/` - Static assets processed by Astro
- `public/` - Static files served as-is (favicon, etc.)

**Component Structure**: Astro components use frontmatter (between `---`) for JavaScript/TypeScript logic and HTML-like template syntax below. Layouts use `<slot />` for content injection.

**TypeScript**: Uses strict mode via `astro/tsconfigs/strict`. Type definitions auto-generated in `.astro/types.d.ts`.

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
