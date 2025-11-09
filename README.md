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
