# Newsletter System Usage Guide

## Overview

The newsletter system allows readers to subscribe to email updates when new stories or chapters are published on ink.seancollings.dev.

## For Subscribers

Visit [https://ink.seancollings.dev](https://ink.seancollings.dev) and enter your email in the subscription form on the homepage. You'll receive email notifications when new content is published.

To unsubscribe, click the unsubscribe link at the bottom of any newsletter email.

## For Authors/Administrators

### Prerequisites

1. **Resend Account**: Sign up at [resend.com](https://resend.com)
2. **Create a Segment**: In Resend dashboard under Contacts, create a segment for newsletter subscribers
3. **Get Credentials**:
   - API Key: Generate in Resend dashboard
   - Segment ID: Copy from your segment settings

### Environment Configuration

#### Local Development

Create `.env` file in project root:

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_SEGMENT_ID=your_segment_id_here
```

#### Cloudflare Pages (Production)

Add environment variables in Cloudflare Pages project settings:
- `RESEND_API_KEY`
- `RESEND_SEGMENT_ID`

#### GitHub Actions

Add repository secrets in GitHub Settings > Secrets and variables > Actions:
- `RESEND_API_KEY`
- `RESEND_SEGMENT_ID`

### Sending Newsletters

#### Local Send (Interactive)

```bash
npm run newsletter
```

This will:
1. Detect content changes since last newsletter tag
2. Open your editor with auto-generated summary
3. Let you edit the message (add personal note, modify content, etc.)
4. Send the email to all subscribers
5. Create a git tag marking what was sent

**To cancel**: Save an empty file in the editor.

#### Local Send (Quick)

```bash
npm run newsletter -- --message "Quick update!"
```

Uses the provided message plus auto-generated content summary.

#### GitHub Actions Send

1. Go to repository **Actions** tab
2. Select "**Send Newsletter**" workflow
3. Click "**Run workflow**"
4. (Optional) Add a personal message
5. Click "**Run workflow**" button

The workflow will send the newsletter and push the git tag automatically.

### How It Works

#### Content Detection

The script compares your current repository state against the last `newsletter/*` git tag to detect:

- **New Stories**: Stories published since last newsletter
- **New Chapters**: Chapters added since last newsletter
- **Updated Chapters**: Chapters modified since last newsletter

Only content with `state: 'published'` in frontmatter is included.

#### Email Format

Emails are sent in both plain text and HTML formats:
- Auto-generated summary with links to new/updated content
- Your personal message (if provided)
- Story titles (not slugs) for chapter listings
- Unsubscribe link (automatically added by Resend)

#### Git Tags

After each send, a tag is created:
- **Format**: `newsletter/YYYY-MM-DD-HHMM`
- **Annotation**: Contains the full email content (markdown)
- **Purpose**: Marks what content has been sent, used for future change detection

View newsletter history:
```bash
git tag -l "newsletter/*"
```

View a specific newsletter:
```bash
git tag -n999 newsletter/2025-12-27-1430
```

### First Newsletter

Since no `newsletter/*` tags exist initially, the first run will include ALL published content. Options:

1. **Send everything**: Let it send as a "catch-up" newsletter
2. **Set a baseline**: Create a tag manually before first send:
   ```bash
   git tag -a newsletter/2025-01-01-0000 -m "Baseline before newsletter system"
   git push origin newsletter/2025-01-01-0000
   ```

### Troubleshooting

#### No changes detected

- Ensure content has `state: 'published'` in frontmatter
- Verify changes are committed to git
- Check newsletter tags exist: `git tag -l "newsletter/*"`

#### Email not sending

- Verify `RESEND_API_KEY` is correct
- Verify `RESEND_SEGMENT_ID` matches your segment
- Check Resend dashboard for errors
- Ensure sending domain is verified in Resend

#### Editor not opening

- Set `EDITOR` environment variable: `export EDITOR=nano`
- Or use `--message` flag instead

#### Subscribers not receiving emails

- Check segment has contacts in Resend dashboard
- Verify contacts are not marked as unsubscribed
- Check Resend logs for delivery status

### Best Practices

1. **Test first**: Send to yourself before sending to all subscribers
2. **Batch updates**: Don't send for every single change - batch multiple updates together
3. **Personal touch**: Add a personal message explaining what's new
4. **Verify content**: Review the auto-generated summary before sending
5. **Check tags**: Ensure tags are pushed to remote for proper tracking

### Workflow Examples

#### Standard Release Workflow

```bash
# 1. Write and publish new content
# 2. Commit changes
git add src/content/
git commit -m "feat: add new chapter"

# 3. Send newsletter
npm run newsletter
# Editor opens with summary, add personal note, save and exit

# 4. Tag is created and pushed automatically
```

#### Quick Update Workflow

```bash
# Make changes, commit
git add src/content/
git commit -m "fix: update chapter text"

# Quick send
npm run newsletter -- --message "Minor updates and fixes!"
```

#### Remote Send Workflow

```bash
# Make changes, commit, push
git add src/content/
git commit -m "feat: new story"
git push

# Send from GitHub Actions UI
# Go to Actions > Send Newsletter > Run workflow
```

## Technical Details

### Architecture

- **Frontend**: Astro component with subscription form
- **API**: Astro server endpoint (`/api/subscribe`)
- **Email Service**: Resend broadcasts API
- **Hosting**: Cloudflare Pages (hybrid mode)
- **Script**: Node.js for content detection and sending

### Files

- `src/components/NewsletterSubscribe.astro` - Subscription form
- `src/pages/api/subscribe.ts` - API endpoint
- `scripts/send-newsletter.js` - Newsletter script
- `.github/workflows/send-newsletter.yml` - GitHub Action

### Content Structure

Stories and chapters must have frontmatter with:
- `state: 'published'` - Only published content is included
- `title` - Used in email
- `storySlug` (chapters) - Links chapter to story
- `chapterNumber` (chapters) - Used in email ordering

See `CLAUDE.md` for full content structure documentation.
