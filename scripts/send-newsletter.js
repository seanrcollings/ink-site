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

// Export for testing
export { getLastNewsletterTag, getChangedFiles, parseFrontmatter, detectContentChanges };
