# Newsletter System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a newsletter subscription and sending system for ink.seancollings.dev that allows readers to subscribe via the website and receive email updates when new stories/chapters are published.

**Architecture:** Three components: (1) Subscription form + Astro server endpoint calling Resend API, (2) Node.js script that detects content changes via git tags and sends emails via Resend, (3) GitHub Action for remote sends. Uses Cloudflare Pages hybrid mode for hosting.

**Tech Stack:** Astro 5.15.4+ with @astrojs/cloudflare adapter, Resend email service, Node.js for newsletter script, gray-matter for frontmatter parsing, marked for markdown-to-HTML conversion.

---

## Task 1: Install Dependencies and Configure Hybrid Mode

**Files:**
- Modify: `package.json`
- Modify: `astro.config.mjs`
- Create: `.env.example`
- Modify: `.gitignore` (if needed)

**Step 1: Install dependencies**

Run:
```bash
npm install resend @astrojs/cloudflare
npm install -D gray-matter marked
```

Expected: Packages installed successfully

**Step 2: Create environment variable template**

Create `.env.example`:
```bash
# Resend API Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_SEGMENT_ID=your_segment_id_here
```

**Step 3: Update Astro config for hybrid mode**

Modify `astro.config.mjs`:
```javascript
// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://ink.seancollings.dev',
  output: 'hybrid',
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()]
  }
});
```

**Step 4: Ensure .gitignore includes .env**

Run:
```bash
grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore
```

Expected: .env is in .gitignore

**Step 5: Commit configuration changes**

Run:
```bash
git add package.json package-lock.json astro.config.mjs .env.example .gitignore
git commit -m "feat: configure Astro hybrid mode with Cloudflare adapter

- Install resend and @astrojs/cloudflare packages
- Configure hybrid output mode in astro.config.mjs
- Add environment variable template"
```

Expected: Commit successful

---

## Task 2: Create Subscription API Endpoint

**Files:**
- Create: `src/pages/api/subscribe.ts`

**Step 1: Create API directory structure**

Run:
```bash
mkdir -p src/pages/api
```

Expected: Directory created

**Step 2: Write the subscription endpoint**

Create `src/pages/api/subscribe.ts`:
```typescript
import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const segmentId = import.meta.env.RESEND_SEGMENT_ID;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();
    const { email } = body;

    // Validate email format
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate environment variables
    if (!import.meta.env.RESEND_API_KEY || !segmentId) {
      console.error('Missing Resend configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add subscriber to Resend segment
    const result = await resend.contacts.create({
      email,
      unsubscribed: false,
    });

    // Add contact to segment if creation was successful
    if (result.data?.id) {
      await resend.contacts.update({
        id: result.data.id,
        segmentIds: [segmentId],
      });
    }

    // Resend returns error in result if subscription fails
    if ('error' in result && result.error) {
      console.error('Resend API error:', result.error);
      return new Response(
        JSON.stringify({ error: 'Failed to subscribe. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Successfully subscribed!' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Subscription error:', error);

    // Check for rate limiting
    if (error instanceof Error && error.message.includes('rate limit')) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

**Step 3: Commit the API endpoint**

Run:
```bash
git add src/pages/api/subscribe.ts
git commit -m "feat: add newsletter subscription API endpoint

- Create POST /api/subscribe endpoint
- Validate email format and input
- Integrate with Resend Contacts API
- Add contacts to segment
- Handle errors and rate limiting"
```

Expected: Commit successful

---

## Task 3: Create Newsletter Subscription Component

**Files:**
- Create: `src/components/NewsletterSubscribe.astro`

**Step 1: Create the subscription form component**

Create `src/components/NewsletterSubscribe.astro`:
```astro
---
// No server-side props needed
---

<div class="newsletter-subscribe">
  <form id="newsletterForm" class="space-y-4">
    <div>
      <label for="email" class="block text-sm font-medium mb-2">
        Subscribe to updates
      </label>
      <div class="flex gap-2">
        <input
          type="email"
          id="email"
          name="email"
          required
          placeholder="your@email.com"
          class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Subscribe
        </button>
      </div>
    </div>
    <div id="message" class="hidden text-sm" role="alert"></div>
  </form>
</div>

<script>
  const form = document.getElementById('newsletterForm') as HTMLFormElement;
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const messageDiv = document.getElementById('message') as HTMLDivElement;
  const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput?.value;
    if (!email) return;

    // Disable form during submission
    submitButton.disabled = true;
    messageDiv.classList.add('hidden');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success
        messageDiv.textContent = data.message || 'Successfully subscribed!';
        messageDiv.className = 'text-sm text-green-600 dark:text-green-400';
        emailInput.value = '';
      } else {
        // Error from server
        messageDiv.textContent = data.error || 'Failed to subscribe. Please try again.';
        messageDiv.className = 'text-sm text-red-600 dark:text-red-400';
      }
    } catch (error) {
      // Network or parsing error
      messageDiv.textContent = 'Network error. Please check your connection and try again.';
      messageDiv.className = 'text-sm text-red-600 dark:text-red-400';
    } finally {
      messageDiv.classList.remove('hidden');
      submitButton.disabled = false;
    }
  });
</script>
```

**Step 2: Commit the subscription component**

Run:
```bash
git add src/components/NewsletterSubscribe.astro
git commit -m "feat: add newsletter subscription form component

- Create form with email input and submit button
- Add client-side validation and submission
- Handle success/error states with user feedback
- Progressive enhancement with JS"
```

Expected: Commit successful

---

## Task 4: Add Newsletter Form to Homepage

**Files:**
- Modify: `src/pages/index.astro`

**Step 1: Import and add newsletter component to homepage**

Modify `src/pages/index.astro`:
```astro
---
import Layout from '../layouts/Layout.astro';
import NewsletterSubscribe from '../components/NewsletterSubscribe.astro';
import { getCollection } from 'astro:content';

// Get published stories only (not unpublished or unlisted)
const stories = await getCollection('stories', ({ data }) => data.state === 'published');

// Get published chapters to find latest per story
const allChapters = await getCollection('chapters', ({ data }) => data.state === 'published');

// Build story data with latest chapter info
const storyData = stories.map(story => {
  const storyChapters = allChapters
    .filter(ch => ch.data.storySlug === story.slug)
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

    <!-- Newsletter Subscription -->
    <div class="mb-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <NewsletterSubscribe />
    </div>

    {storyData.length === 0 ? (
      <p class="text-gray-600 dark:text-gray-400">No stories yet. Check back soon!</p>
    ) : (
      <div class="space-y-8">
        {storyData.map(({ story, latestChapter, chapterCount }) => (
          <article class="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div class="flex justify-between items-start mb-3">
              <h2 class="text-2xl font-bold">
                <a
                  href={`/${story.slug}`}
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
                href={`/${story.slug}`}
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

**Step 2: Commit the homepage changes**

Run:
```bash
git add src/pages/index.astro
git commit -m "feat: add newsletter subscription to homepage

- Import NewsletterSubscribe component
- Add subscription form above story list
- Style with consistent theme"
```

Expected: Commit successful

---

## Task 5: Create Newsletter Script - Content Detection

**Files:**
- Create: `scripts/send-newsletter.js`

**Step 1: Create scripts directory**

Run:
```bash
mkdir -p scripts
```

Expected: Directory created

**Step 2: Write content detection logic**

Create `scripts/send-newsletter.js`:
```javascript
#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/**
 * Get the most recent newsletter tag
 * @returns {string|null} Tag name or null if none exist
 */
function getLastNewsletterTag() {
  try {
    const tags = execSync('git tag -l "newsletter/*"', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);

    if (tags.length === 0) return null;

    // Sort tags by date (format: newsletter/YYYY-MM-DD-HHMM)
    return tags.sort().reverse()[0];
  } catch (error) {
    console.error('Error fetching git tags:', error.message);
    process.exit(1);
  }
}

/**
 * Get list of files that are new or modified since a tag
 * @param {string|null} tag - Tag to compare against, or null for all files
 * @param {string} pattern - File pattern to match
 * @returns {Array<{path: string, status: 'new'|'modified'}>}
 */
function getChangedFiles(tag, pattern) {
  try {
    if (!tag) {
      // No previous newsletter - treat all files as new
      const allFiles = execSync(`git ls-files "${pattern}"`, { encoding: 'utf-8' })
        .trim()
        .split('\n')
        .filter(Boolean);

      return allFiles.map(path => ({ path, status: 'new' }));
    }

    // Get files that exist now but didn't at the tag
    const newFiles = execSync(
      `git diff --name-only --diff-filter=A ${tag} HEAD -- "${pattern}"`,
      { encoding: 'utf-8' }
    )
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(path => ({ path, status: 'new' }));

    // Get files that existed at tag and have been modified
    const modifiedFiles = execSync(
      `git diff --name-only --diff-filter=M ${tag} HEAD -- "${pattern}"`,
      { encoding: 'utf-8' }
    )
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(path => ({ path, status: 'modified' }));

    return [...newFiles, ...modifiedFiles];
  } catch (error) {
    console.error('Error detecting changed files:', error.message);
    process.exit(1);
  }
}

/**
 * Parse frontmatter from markdown file
 * @param {string} filePath
 * @returns {Object} Parsed frontmatter data
 */
function parseFrontmatter(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(fileContent);
    return data;
  } catch (error) {
    console.warn(`Warning: Could not parse frontmatter in ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Detect content changes since last newsletter
 * @returns {Object} Changes object with new/updated stories and chapters
 */
function detectContentChanges() {
  const lastTag = getLastNewsletterTag();

  console.log(lastTag
    ? `Comparing against last newsletter: ${lastTag}`
    : 'No previous newsletter found - treating all content as new'
  );

  // Detect story changes
  const storyFiles = getChangedFiles(lastTag, 'src/content/stories/*.md');
  const newStories = storyFiles
    .filter(f => f.status === 'new')
    .map(f => {
      const data = parseFrontmatter(f.path);
      if (!data) return null;

      // Only include published stories
      if (data.state !== 'published') return null;

      const slug = path.basename(f.path, '.md');
      return {
        title: data.title,
        slug,
        description: data.description,
        url: `https://ink.seancollings.dev/${slug}`,
      };
    })
    .filter(Boolean);

  // Detect chapter changes
  const chapterFiles = getChangedFiles(lastTag, 'src/content/chapters/**/*.md');

  const newChapters = [];
  const updatedChapters = [];

  for (const file of chapterFiles) {
    const data = parseFrontmatter(file.path);
    if (!data) continue;

    // Only include published chapters
    if (data.state !== 'published') continue;

    const chapterSlug = path.basename(file.path, '.md');
    const storySlug = data.storySlug;

    const chapter = {
      title: data.title,
      chapterNumber: data.chapterNumber,
      storySlug,
      chapterSlug,
      summary: data.summary,
      url: `https://ink.seancollings.dev/${storySlug}/${chapterSlug}`,
    };

    if (file.status === 'new') {
      newChapters.push(chapter);
    } else {
      updatedChapters.push(chapter);
    }
  }

  // Sort chapters by story and chapter number
  const sortChapters = (chapters) =>
    chapters.sort((a, b) => {
      if (a.storySlug !== b.storySlug) {
        return a.storySlug.localeCompare(b.storySlug);
      }
      return a.chapterNumber - b.chapterNumber;
    });

  return {
    newStories,
    newChapters: sortChapters(newChapters),
    updatedChapters: sortChapters(updatedChapters),
  };
}

// Export for testing
export { getLastNewsletterTag, getChangedFiles, parseFrontmatter, detectContentChanges };
```

**Step 3: Test content detection**

Run:
```bash
node scripts/send-newsletter.js
```

Expected: Script runs without errors (may not output anything yet)

**Step 4: Commit content detection**

Run:
```bash
git add scripts/send-newsletter.js
git commit -m "feat: add content detection for newsletter script

- Implement git tag-based change detection
- Parse frontmatter from markdown files
- Detect new/updated stories and chapters
- Filter for published content only"
```

Expected: Commit successful

---

## Task 6: Newsletter Script - Email Generation

**Files:**
- Modify: `scripts/send-newsletter.js`

**Step 1: Add email generation functions**

Modify `scripts/send-newsletter.js` - add these functions before the exports:

```javascript
/**
 * Generate markdown summary of content changes
 * @param {Object} changes - Content changes object
 * @returns {string} Markdown summary
 */
function generateContentSummary(changes) {
  const { newStories, newChapters, updatedChapters } = changes;
  let markdown = '';

  if (newStories.length > 0) {
    markdown += '## New Stories\n\n';
    for (const story of newStories) {
      markdown += `- [${story.title}](${story.url})\n`;
    }
    markdown += '\n';
  }

  if (newChapters.length > 0) {
    markdown += '## New Chapters\n\n';
    for (const chapter of newChapters) {
      markdown += `- [${chapter.storySlug} - Chapter ${chapter.chapterNumber}: ${chapter.title}](${chapter.url})\n`;
    }
    markdown += '\n';
  }

  if (updatedChapters.length > 0) {
    markdown += '## Updated Chapters\n\n';
    for (const chapter of updatedChapters) {
      markdown += `- [${chapter.storySlug} - Chapter ${chapter.chapterNumber}: ${chapter.title}](${chapter.url})\n`;
    }
    markdown += '\n';
  }

  return markdown;
}

/**
 * Convert markdown to plain text
 * @param {string} markdown
 * @returns {string}
 */
function markdownToPlainText(markdown) {
  return markdown
    // Remove markdown links but keep text and URL
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    // Remove headers but keep text
    .replace(/^#+\s+/gm, '')
    // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Convert markdown to HTML
 * @param {string} markdown
 * @returns {string}
 */
function markdownToHTML(markdown) {
  // Simple markdown to HTML conversion
  let html = markdown
    // Headers
    .replace(/^## (.+)$/gm, '<h2 style="color: #1f2937; font-size: 1.5em; font-weight: bold; margin: 1.5em 0 0.5em;">$1</h2>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #2563eb; text-decoration: none;">$1</a>')
    // List items
    .replace(/^- (.+)$/gm, '<li style="margin: 0.5em 0;">$1</li>')
    // Wrap lists
    .replace(/(<li[^>]*>.*<\/li>\n?)+/gs, '<ul style="list-style-type: disc; padding-left: 1.5em; margin: 1em 0;">$&</ul>')
    // Paragraphs
    .replace(/^(?!<[uh]|<li)(.+)$/gm, '<p style="margin: 1em 0; line-height: 1.6;">$1</p>')
    // Clean up
    .replace(/\n/g, '');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #374151;">
  ${html}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 2em 0;">
  <p style="color: #6b7280; font-size: 0.875em; margin: 1em 0;">
    You're receiving this because you subscribed to updates from <a href="https://ink.seancollings.dev" style="color: #2563eb;">ink.seancollings.dev</a>.
  </p>
</body>
</html>
  `.trim();
}

/**
 * Check if there are any changes to send
 * @param {Object} changes
 * @returns {boolean}
 */
function hasChanges(changes) {
  return changes.newStories.length > 0 ||
         changes.newChapters.length > 0 ||
         changes.updatedChapters.length > 0;
}
```

**Step 2: Commit email generation**

Run:
```bash
git add scripts/send-newsletter.js
git commit -m "feat: add email content generation to newsletter script

- Generate markdown summary of changes
- Convert markdown to plain text
- Convert markdown to HTML with styling
- Add helper to check if changes exist"
```

Expected: Commit successful

---

## Task 7: Newsletter Script - Editor Integration

**Files:**
- Modify: `scripts/send-newsletter.js`

**Step 1: Add editor integration and argument parsing**

Modify `scripts/send-newsletter.js` - add these imports at the top:

```javascript
import { spawn } from 'child_process';
import os from 'os';
```

Add these functions before the exports:

```javascript
/**
 * Parse command-line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { message: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--message' && args[i + 1]) {
      parsed.message = args[i + 1];
      i++; // Skip next arg
    }
  }

  return parsed;
}

/**
 * Get personal note from user via editor or command-line flag
 * @param {string|null} messageFlag - Message from --message flag
 * @param {string} contentSummary - Auto-generated content summary
 * @returns {Promise<string>} Full email content (note + summary)
 */
async function getPersonalNote(messageFlag, contentSummary) {
  if (messageFlag) {
    // Use message from command-line flag
    return `${messageFlag}\n\n${contentSummary}`;
  }

  // Create draft file with template
  const draftPath = path.join(os.tmpdir(), 'newsletter-draft.md');
  const template = `# Add your personal note above this line
# Lines starting with # will be removed

${contentSummary}`;

  fs.writeFileSync(draftPath, template, 'utf-8');

  // Open editor
  const editor = process.env.EDITOR || process.env.VISUAL || 'vim';

  return new Promise((resolve, reject) => {
    const child = spawn(editor, [draftPath], {
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error('Editor exited with error code'));
        return;
      }

      try {
        // Read edited content
        const content = fs.readFileSync(draftPath, 'utf-8');

        // Remove comment lines and template
        const lines = content.split('\n');
        const personalNote = lines
          .filter(line => !line.startsWith('#'))
          .join('\n')
          .replace(contentSummary, '') // Remove the template summary
          .trim();

        // Clean up draft file
        fs.unlinkSync(draftPath);

        // Combine personal note with fresh summary
        const fullContent = personalNote
          ? `${personalNote}\n\n${contentSummary}`
          : contentSummary;

        resolve(fullContent);
      } catch (error) {
        reject(error);
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}
```

**Step 2: Commit editor integration**

Run:
```bash
git add scripts/send-newsletter.js
git commit -m "feat: add editor integration for personal notes

- Parse --message command-line flag
- Open $EDITOR for interactive note composition
- Generate draft template with content summary
- Combine personal note with auto-generated summary"
```

Expected: Commit successful

---

## Task 8: Newsletter Script - Resend Integration

**Files:**
- Modify: `scripts/send-newsletter.js`

**Step 1: Add Resend sending logic**

Modify `scripts/send-newsletter.js` - add at the top with other imports:

```javascript
import { Resend } from 'resend';
import 'dotenv/config';
```

Add these functions before the exports:

```javascript
/**
 * Send email via Resend
 * @param {string} markdownContent - Email content in markdown
 * @returns {Promise<void>}
 */
async function sendEmail(markdownContent) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const segmentId = process.env.RESEND_SEGMENT_ID;

  if (!process.env.RESEND_API_KEY || !segmentId) {
    throw new Error('Missing RESEND_API_KEY or RESEND_SEGMENT_ID environment variables');
  }

  const plainText = markdownToPlainText(markdownContent);
  const html = markdownToHTML(markdownContent);

  try {
    const result = await resend.broadcasts.create({
      segmentId,
      from: 'ink <updates@ink.seancollings.dev>',
      subject: 'New updates on ink',
      text: plainText,
      html,
    });

    if ('error' in result && result.error) {
      throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
    }

    console.log('✓ Email sent successfully');
    console.log(`  Broadcast ID: ${result.data?.id}`);
  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Create git tag with email content
 * @param {string} content - Email content to store in tag annotation
 */
function createNewsletterTag(content) {
  try {
    const now = new Date();
    const tagName = `newsletter/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    // Create annotated tag
    const tagFile = path.join(os.tmpdir(), 'tag-message.txt');
    fs.writeFileSync(tagFile, content, 'utf-8');

    execSync(`git tag -a "${tagName}" -F "${tagFile}"`, { stdio: 'inherit' });

    fs.unlinkSync(tagFile);

    console.log(`✓ Created git tag: ${tagName}`);

    // Push tag to remote
    execSync(`git push origin "${tagName}"`, { stdio: 'inherit' });
    console.log('✓ Pushed tag to remote');
  } catch (error) {
    throw new Error(`Failed to create/push git tag: ${error.message}`);
  }
}
```

**Step 2: Add dotenv dependency**

Run:
```bash
npm install dotenv
```

Expected: Package installed

**Step 3: Commit Resend integration**

Run:
```bash
git add scripts/send-newsletter.js package.json package-lock.json
git commit -m "feat: add Resend email sending and git tagging

- Integrate with Resend broadcasts API
- Send multipart emails (plain text + HTML)
- Create annotated git tag with email content
- Push tag to remote repository
- Add dotenv for environment variables"
```

Expected: Commit successful

---

## Task 9: Newsletter Script - Main Function

**Files:**
- Modify: `scripts/send-newsletter.js`
- Modify: `package.json`

**Step 1: Add main execution logic**

Modify `scripts/send-newsletter.js` - add at the end of the file:

```javascript
/**
 * Main execution
 */
async function main() {
  try {
    console.log('📧 Newsletter Script\n');

    // Parse arguments
    const args = parseArgs();

    // Detect content changes
    const changes = detectContentChanges();

    // Check if there are any changes
    if (!hasChanges(changes)) {
      console.log('ℹ No new or updated content since last newsletter.');
      console.log('  Nothing to send.');
      process.exit(0);
    }

    // Display what was found
    console.log('\nChanges detected:');
    if (changes.newStories.length > 0) {
      console.log(`  • ${changes.newStories.length} new ${changes.newStories.length === 1 ? 'story' : 'stories'}`);
    }
    if (changes.newChapters.length > 0) {
      console.log(`  • ${changes.newChapters.length} new ${changes.newChapters.length === 1 ? 'chapter' : 'chapters'}`);
    }
    if (changes.updatedChapters.length > 0) {
      console.log(`  • ${changes.updatedChapters.length} updated ${changes.updatedChapters.length === 1 ? 'chapter' : 'chapters'}`);
    }
    console.log('');

    // Generate content summary
    const contentSummary = generateContentSummary(changes);

    // Get personal note (via editor or --message flag)
    console.log(args.message ? 'Using message from --message flag\n' : 'Opening editor for personal note...\n');
    const emailContent = await getPersonalNote(args.message, contentSummary);

    // Send email
    console.log('Sending email...');
    await sendEmail(emailContent);

    // Create git tag
    console.log('Creating newsletter tag...');
    createNewsletterTag(emailContent);

    console.log('\n✓ Newsletter sent successfully!');
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

**Step 2: Add npm script**

Modify `package.json` - add to scripts section:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "newsletter": "node scripts/send-newsletter.js"
  }
}
```

**Step 3: Test the script (dry run without sending)**

First, create a `.env` file with placeholder values:
```bash
cat > .env << 'EOF'
RESEND_API_KEY=test_key
RESEND_SEGMENT_ID=test_segment
EOF
```

**Step 4: Commit main function**

Run:
```bash
git add scripts/send-newsletter.js package.json
git commit -m "feat: complete newsletter script with main execution

- Add main function orchestrating full workflow
- Display detected changes summary
- Handle errors and exit codes
- Add npm script for easy execution
- Support both interactive and --message modes"
```

Expected: Commit successful

---

## Task 10: Create GitHub Action Workflow

**Files:**
- Create: `.github/workflows/send-newsletter.yml`

**Step 1: Create GitHub workflows directory**

Run:
```bash
mkdir -p .github/workflows
```

Expected: Directory created

**Step 2: Create newsletter workflow**

Create `.github/workflows/send-newsletter.yml`:

```yaml
name: Send Newsletter

on:
  workflow_dispatch:
    inputs:
      message:
        description: 'Personal message (optional)'
        required: false
        type: string

jobs:
  send-newsletter:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full git history for tag comparison

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Send newsletter
        env:
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          RESEND_SEGMENT_ID: ${{ secrets.RESEND_SEGMENT_ID }}
        run: |
          if [ -n "${{ inputs.message }}" ]; then
            node scripts/send-newsletter.js --message "${{ inputs.message }}"
          else
            node scripts/send-newsletter.js --message "New updates are live!"
          fi

      - name: Push tags
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git push --tags
```

**Step 3: Commit GitHub Action**

Run:
```bash
git add .github/workflows/send-newsletter.yml
git commit -m "feat: add GitHub Action for newsletter sending

- Create manual workflow_dispatch trigger
- Accept optional message input
- Checkout with full git history
- Install dependencies and run newsletter script
- Push new newsletter tags to repository"
```

Expected: Commit successful

---

## Task 11: Add Documentation

**Files:**
- Create: `docs/newsletter-usage.md`
- Modify: `README.md` (if exists, otherwise skip)

**Step 1: Create usage documentation**

Create `docs/newsletter-usage.md`:

```markdown
# Newsletter System Usage

## Overview

The newsletter system allows subscribers to receive email updates when new stories or chapters are published.

## For Subscribers

Visit [https://ink.seancollings.dev](https://ink.seancollings.dev) and enter your email in the subscription form on the homepage.

## For Authors/Administrators

### Prerequisites

1. **Resend Account**: Sign up at [resend.com](https://resend.com)
2. **Create a Segment**: In Resend dashboard, create a segment for subscribers
3. **Get API Key**: Generate API key in Resend dashboard
4. **Configure Environment Variables**:
   - Local: Create `.env` file with `RESEND_API_KEY` and `RESEND_SEGMENT_ID`
   - Cloudflare: Add environment variables in Pages settings
   - GitHub: Add secrets in repository settings

### Sending Newsletters

#### Local Send (Interactive)

```bash
npm run newsletter
```

This will:
1. Detect changes since last newsletter
2. Open your editor to add a personal note
3. Send email to all subscribers
4. Create and push a git tag

#### Local Send (With Message)

```bash
npm run newsletter -- --message "Quick update: new chapter!"
```

#### GitHub Actions Send

1. Go to repository Actions tab
2. Select "Send Newsletter" workflow
3. Click "Run workflow"
4. Optionally add a personal message
5. Click "Run"

### How It Works

1. **Change Detection**: Compares current content against last `newsletter/*` git tag
2. **Content Filtering**: Only includes published stories/chapters (`state: 'published'`)
3. **Email Generation**: Creates markdown summary with links
4. **Sending**: Sends multipart email (plain text + HTML) via Resend
5. **Tagging**: Creates annotated git tag `newsletter/YYYY-MM-DD-HHMM` with email content

### First Newsletter

Since no `newsletter/*` tags exist initially, the first run will include ALL published content. Options:

- **Send welcome newsletter**: Let it send everything as a "catch-up" email
- **Mark a baseline**: Create a manual tag before running:
  ```bash
  git tag -a newsletter/2025-01-01-0000 -m "Initial baseline"
  git push origin newsletter/2025-01-01-0000
  ```

### Troubleshooting

**No changes detected**
- Ensure content has `state: 'published'` in frontmatter
- Check that changes have been committed to git
- Verify newsletter tags exist: `git tag -l "newsletter/*"`

**Email not sending**
- Verify `RESEND_API_KEY` is set correctly
- Check `RESEND_SEGMENT_ID` matches your segment
- Review Resend dashboard for errors
- Check Resend sending domain is verified

**Editor not opening**
- Set `EDITOR` environment variable: `export EDITOR=nano`
- Or use `--message` flag instead

### Newsletter History

View all sent newsletters:
```bash
git tag -l "newsletter/*"
```

View content of a specific newsletter:
```bash
git tag -n999 newsletter/2025-01-15-1430
```

## Architecture

- **Frontend**: Astro component + server endpoint
- **Backend**: Resend API for email delivery
- **Hosting**: Cloudflare Pages (hybrid mode)
- **Script**: Node.js for content detection and sending
```

**Step 2: Update README (if exists)**

Run:
```bash
if [ -f README.md ]; then
  echo "
## Newsletter System

Subscribers can sign up for email updates on the homepage. To send newsletters, see [docs/newsletter-usage.md](docs/newsletter-usage.md).
" >> README.md
  git add README.md
fi
```

**Step 3: Commit documentation**

Run:
```bash
git add docs/newsletter-usage.md
git commit -m "docs: add newsletter system usage guide

- Document subscriber flow
- Document sending workflow (local and GitHub Actions)
- Explain change detection mechanism
- Add troubleshooting section
- Document first-time setup"
```

Expected: Commit successful

---

## Task 12: Local Testing Setup

**Files:**
- None (manual testing steps)

**Step 1: Create Resend account and segment**

1. Visit https://resend.com and sign up
2. Navigate to Contacts in the dashboard
3. Create a new Segment for your newsletter subscribers
4. Copy the Segment ID
5. Generate an API key
6. Note both values for next step

**Step 2: Configure local environment**

Create `.env` file:
```bash
cat > .env << 'EOF'
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_SEGMENT_ID=your_actual_segment_id_here
EOF
```

Replace placeholders with actual values from Resend.

**Step 3: Test subscription endpoint locally**

Run dev server:
```bash
npm run dev
```

Visit http://localhost:4321 and test the subscription form with your email.

Check Resend dashboard to verify subscriber was added.

**Step 4: Test newsletter script**

Create a test newsletter tag to simulate previous send:
```bash
git tag -a newsletter/2025-01-01-0000 -m "Test baseline"
```

Make a change to a story or chapter (or create test content).

Run newsletter script with message flag:
```bash
npm run newsletter -- --message "Test newsletter"
```

Verify:
- Script detects changes
- Email is sent (check your inbox)
- Git tag is created: `git tag -l "newsletter/*"`

**Step 5: Clean up test data**

Remove test tag:
```bash
git tag -d newsletter/2025-01-01-0000
```

If you created test content, revert it or delete the test newsletter tag created by the script.

---

## Task 13: Cloudflare Pages Deployment

**Files:**
- None (Cloudflare dashboard configuration)

**Step 1: Create Cloudflare Pages project**

1. Log in to Cloudflare dashboard
2. Go to Pages
3. Click "Create a project"
4. Connect to your GitHub repository
5. Select the repository

**Step 2: Configure build settings**

Build settings:
- **Framework preset**: Astro
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Node version**: 20

**Step 3: Add environment variables**

In Cloudflare Pages project settings > Environment variables:

Add for Production:
- `RESEND_API_KEY`: Your Resend API key
- `RESEND_SEGMENT_ID`: Your Resend segment ID

**Step 4: Deploy**

Click "Save and Deploy"

Wait for build to complete.

**Step 5: Test deployed subscription**

1. Visit your Cloudflare Pages URL
2. Test the subscription form
3. Verify subscriber is added in Resend dashboard

**Step 6: Update DNS (when ready)**

When ready to switch from GitHub Pages:

1. In Cloudflare dashboard, go to your domain
2. Update DNS records to point to Cloudflare Pages
3. Verify site works at https://ink.seancollings.dev

---

## Task 14: Configure GitHub Secrets

**Files:**
- None (GitHub repository settings)

**Step 1: Add repository secrets**

1. Go to GitHub repository
2. Settings > Secrets and variables > Actions
3. Click "New repository secret"

Add two secrets:
- Name: `RESEND_API_KEY`, Value: Your Resend API key
- Name: `RESEND_SEGMENT_ID`, Value: Your Resend segment ID

**Step 2: Test GitHub Action**

1. Go to Actions tab
2. Click "Send Newsletter" workflow
3. Click "Run workflow"
4. Add a test message: "Testing GitHub Action"
5. Click "Run workflow"

**Step 3: Verify action execution**

1. Watch the workflow run
2. Check for errors
3. Verify email was sent
4. Verify tag was created and pushed

---

## Task 15: Final Verification

**Files:**
- None (verification steps)

**Step 1: Verify subscription flow**

1. Visit production site
2. Subscribe with a test email
3. Check Resend dashboard for new subscriber
4. Verify confirmation (if configured in Resend)

**Step 2: Verify local newsletter send**

1. Make a content change (add/update chapter)
2. Commit the change
3. Run `npm run newsletter -- --message "Final test"`
4. Verify email received
5. Verify git tag created

**Step 3: Verify GitHub Action send**

1. Make another content change
2. Commit and push
3. Trigger GitHub Action
4. Verify email received
5. Verify tag appears in repository

**Step 4: Review newsletter history**

```bash
git tag -l "newsletter/*"
git tag -n999 newsletter/YYYY-MM-DD-HHMM  # Use actual tag
```

Verify tag annotation contains email content.

**Step 5: Documentation check**

Review `docs/newsletter-usage.md` and ensure all steps are accurate based on your testing.

---

## Completion

All tasks complete! The newsletter system is now fully functional:

- ✓ Subscription form on homepage
- ✓ Server endpoint integrated with Resend
- ✓ Newsletter script with content detection
- ✓ Local and remote sending capability
- ✓ Git tag-based change tracking
- ✓ Deployed to Cloudflare Pages
- ✓ Documentation complete

### Next Steps (Optional)

Consider these future enhancements:
- Add unsubscribe page/link
- Create newsletter archive on website
- Add analytics/open tracking
- Implement newsletter preview before sending
- Add subscriber count display
