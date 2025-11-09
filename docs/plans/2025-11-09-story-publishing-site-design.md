# Story Publishing Site Design

**Date:** 2025-11-09
**Domain:** ink.seancollings.dev
**Purpose:** Multi-story publishing platform for hosting serialized fiction

## Overview

A static Astro site for publishing multiple stories with chapters. Content is written in markdown externally, then imported into the project for publishing. The site supports browsing stories, reading chapters sequentially, and tracking reading progress.

## Content Architecture

### Content Collections

Two primary content types managed via Astro Content Collections:

**Stories** (`src/content/stories/`)
- Each story has one markdown file defining metadata
- Frontmatter schema:
  ```typescript
  {
    title: string,
    slug: string,              // Must match chapter folder name
    description: string,
    status: "ongoing" | "complete" | "hiatus",
    startDate: date,
    coverImage?: string
  }
  ```

**Chapters** (`src/content/chapters/`)
- Organized in folders by story slug
- Frontmatter schema:
  ```typescript
  {
    title: string,
    chapterNumber: number,
    storySlug: string,         // Links to parent story
    publishDate: date,
    summary?: string
  }
  ```

### File Structure

```
src/content/
  stories/
    my-first-story.md
    another-tale.md
  chapters/
    my-first-story/
      the-beginning.md
      rising-action.md
    another-tale/
      prologue.md
```

### URL Structure

- Homepage: `/`
- Story page: `/{story-slug}` (e.g., `/my-first-story`)
- Chapter: `/{story-slug}/{chapter-slug}` (e.g., `/my-first-story/the-beginning`)

Chapter slugs derived from markdown filenames.

## Page Structure

### Homepage (`/`)
- Story library view
- Lists all stories with:
  - Title, description, status
  - Cover image (if provided)
  - Latest chapter information
  - Link to story page

### Story Page (`/[storySlug]`)
- Story metadata display
- Complete chapter list
- Each chapter shows: title, publish date, summary
- "Start Reading" button (links to chapter 1)

### Chapter Reading Page (`/[storySlug]/[chapterSlug]`)
- Full markdown content rendered
- Previous/Next chapter navigation (top and bottom)
- Back to chapter list link
- Reading progress indicator
- Dark mode toggle
- Bookmarking functionality

## Reading Experience Features

### Dark Mode
- Site-wide toggle in header/nav
- Preference stored in localStorage
- Tailwind dark mode (class strategy)
- Persists across page navigation

### Reading Progress Indicator
- Fixed progress bar at top of viewport
- Shows percentage scrolled through chapter
- Visible only on chapter reading pages
- Updates smoothly on scroll

### Bookmarking
- Auto-saves scroll position per chapter
- Stored in localStorage: `bookmark-{storySlug}-{chapterSlug}`
- On return, prompts: "Continue where you left off?"
- Client-side only, no authentication required

### Typography
- Tailwind Typography plugin for prose styling
- Optimal line length for readability
- Comfortable line height and spacing
- Fully responsive (mobile and desktop)

## Technical Stack

- **Framework:** Astro 5.x
- **Content:** Content Collections with TypeScript validation
- **Styling:** Tailwind CSS with dark mode support
- **Language:** TypeScript (strict mode)
- **Deployment:** GitHub Actions → GitHub Pages
- **Domain:** ink.seancollings.dev

## Publishing Workflow

1. Write chapters in external markdown editor
2. Add required frontmatter to each file
3. Copy markdown files into appropriate story folder in repo
4. Preview locally: `npm run dev`
5. Commit and push to main branch
6. GitHub Actions automatically builds and deploys
7. Site live at ink.seancollings.dev in ~2-3 minutes

**Publishing rule:** If it's in the repo, it's published. Keep drafts outside the project.

## Deployment Configuration

### GitHub Actions
- Trigger on push to `main`
- Uses official Astro GitHub Pages action
- Builds with `npm run build`
- Deploys to GitHub Pages automatically

### Astro Config
- Site URL: `https://ink.seancollings.dev`
- Base path: `/` (custom domain, no subpath needed)
- Output: `static` (fully static site)
- Tailwind integration via `npx astro add tailwind`

### Custom Domain
- CNAME file: `public/CNAME` containing `ink.seancollings.dev`
- DNS: CNAME record pointing to GitHub Pages

## Error Handling & Edge Cases

### 404 Page
- Custom 404 (`src/pages/404.astro`)
- Links back to homepage
- Consistent styling

### Content Edge Cases
- Story with no chapters: "Coming soon" message
- Invalid frontmatter: Build fails with validation error
- Missing chapter: Build fails (fail fast)

### Navigation Edge Cases
- First chapter: Previous button hidden/disabled
- Last chapter: Next button shows "End of current chapters" or hidden
- Story page displays total chapter count

### SEO & Metadata
- Dynamic page titles: `{Chapter Title} - {Story Title}`
- Meta descriptions from story/chapter summaries
- Open Graph tags for social sharing
- Auto-generated sitemap

### Performance
- Tailwind CSS purged in production
- Markdown processed at build time
- Optimized for fast static page loads

## Future Enhancements (Not in Initial Version)

These can be added later if desired:
- RSS feed for new chapters
- "Latest updates" page showing recent chapters across stories
- Font size/spacing controls
- Social sharing buttons
- Chapter comments
- Search functionality

## Design Principles

- **Content-first:** Reading experience is paramount
- **YAGNI:** Start simple, add features only when needed
- **Fail fast:** Content validation at build time prevents broken deploys
- **Git-based publishing:** Simple workflow, no CMS needed
- **Static-first:** Fast, secure, easy to host
