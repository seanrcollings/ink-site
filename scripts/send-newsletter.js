#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import matter from 'gray-matter';
import { Resend } from 'resend';
import 'dotenv/config';

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

// Export for testing
export { getLastNewsletterTag, getChangedFiles, parseFrontmatter, detectContentChanges };
