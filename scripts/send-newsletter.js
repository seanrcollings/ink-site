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
