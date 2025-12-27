# Newsletter System Design

**Date**: 2025-12-27
**Status**: Design Complete

## Overview

A newsletter system for ink.seancollings.dev that allows readers to subscribe via the website and receive email updates when new stories or chapters are published. The system uses Resend for email delivery, Cloudflare Pages for hosting, and git tags to track what content has been sent.

## Goals

- Allow readers to subscribe to updates via a form on the website
- Send email notifications when new/updated content is published
- Manually control when emails are sent to avoid flooding inboxes
- Track newsletter history using git tags
- Support both local and GitHub Actions-triggered sends

## Architecture

### Components

1. **Subscription Form & API** - Astro component + server endpoint
2. **Newsletter Script** - Node.js script for content detection and email sending
3. **GitHub Action** - Manual workflow trigger for remote sends

### Technology Stack

- **Email Service**: Resend (3,000 emails/month free tier)
- **Hosting**: Cloudflare Pages (hybrid mode)
- **Framework**: Astro 5.15.4+ with `@astrojs/cloudflare` adapter
- **Email Format**: Multipart (plain text + HTML)

## Subscription Flow

### Frontend Component

**File**: `src/components/NewsletterSubscribe.astro`

A simple form with:
- Email input field
- Submit button
- Success/error message display
- Progressive enhancement (works without JS, better UX with it)

### Server Endpoint

**File**: `src/pages/api/subscribe.ts`

Astro server endpoint that:
- Accepts POST requests with email
- Validates email format
- Calls Resend Contacts API to add subscriber to segment
- Returns JSON success/error responses
- Uses `export const prerender = false` to run server-side

**Dependencies**: `npm install resend`

### Environment Variables

- `RESEND_API_KEY` - Resend API key
- `RESEND_SEGMENT_ID` - Subscriber segment ID

Stored in:
- Cloudflare Pages settings (production)
- Local `.env` file (development, gitignored)

### Cloudflare Setup

1. Install `@astrojs/cloudflare` adapter
2. Set `output: 'hybrid'` in Astro config
3. All pages remain static except `/api/subscribe`
4. Connect Cloudflare Pages to GitHub repo
5. Configure environment variables in Cloudflare dashboard

## Newsletter Script

### File Structure

**Script**: `scripts/send-newsletter.js`

### Content Detection Logic

1. Find most recent `newsletter/*` git tag
2. If no tags exist, treat entire repo as new content
3. Compare content between tag and HEAD:
   - **New Stories**: Files in `src/content/stories/` that didn't exist at tag
   - **New Chapters**: Files in `src/content/chapters/` that didn't exist at tag
   - **Updated Chapters**: Files with different content (via git diff)
4. Parse markdown frontmatter to extract:
   - Story/chapter titles
   - Chapter numbers
   - Story slugs
5. Build URLs based on routing structure: `/stories/{story-slug}/{chapter-slug}`

### Personal Note Flow

Script accepts optional `--message "Your note"` flag:

**With `--message` flag** (for GitHub Actions):
- Use provided message directly
- Skip editor interaction

**Without flag** (local usage):
- Generate draft markdown with auto-generated summary
- Open `$EDITOR` (fallback: vim/nano) for user to add personal note
- Read file after user saves and closes

### Email Generation

1. Combine personal note + content summary into markdown
2. Convert markdown to:
   - Plain text version
   - HTML version (styled)
3. Create multipart email with both versions

### Email Content Structure

```
[Personal note from author]

## New Stories
- Story Title (link)

## New Chapters
- Story Name - Chapter X: Chapter Title (link)
- Story Name - Chapter Y: Chapter Title (link)

## Updated Chapters
- Story Name - Chapter Z: Chapter Title (link)
```

### Sending & Tagging

1. Call Resend API to send email to all subscribers in segment
2. On success, create annotated git tag:
   - Tag name: `newsletter/YYYY-MM-DD-HHMM`
   - Annotation: Full markdown content of email
3. Push tag to remote repository

## GitHub Action

### File

`.github/workflows/send-newsletter.yml`

### Trigger

Manual trigger (`workflow_dispatch`) with optional text input for personal message.

### Steps

1. Checkout repository with full git history (`fetch-depth: 0`)
2. Setup Node.js environment
3. Install dependencies (`npm install`)
4. Run newsletter script:
   - If message provided: `node scripts/send-newsletter.js --message "$MESSAGE"`
   - If not: `node scripts/send-newsletter.js`
5. Push new newsletter tag to repository

### Secrets

Configure in GitHub repository settings:
- `RESEND_API_KEY`
- `RESEND_SEGMENT_ID`

## Error Handling

### Subscription Errors

- **Invalid email format**: Return 400 with user-friendly message
- **Duplicate subscriber**: Resend handles gracefully, treat as success
- **Resend API failure**: Return 500, log error details
- **Rate limiting**: Return 429 with retry message

### Newsletter Script Errors

- **No newsletter tags exist**: Treat entire repo as new, send everything published
- **No changes since last tag**: Exit with "No updates to send", don't create tag
- **Editor process fails/cancelled**: Abort send, don't create tag
- **Resend API failure**: Show error, don't create tag (prevents mistaken "sent" state)
- **Malformed frontmatter**: Skip that file, warn in output, continue with others
- **Git history unavailable**: Validate before proceeding, fail with clear error

### Cloudflare Deployment

- Add health check endpoint to verify API is working
- Set appropriate CORS headers for future flexibility
- Monitor Cloudflare Functions logs for errors

## Git Tag Format

- **Format**: `newsletter/YYYY-MM-DD-HHMM`
- **Rationale**: Supports multiple sends per day if needed
- **Annotation**: Markdown content of email (not HTML)
- **Purpose**:
  - Marks what content has been sent (for diffing)
  - Provides audit trail of newsletter history

## Testing Strategy

### Local Development

1. Test subscription form with `npm run dev`
2. Create test Resend account/segment for development
3. Test newsletter script with `--message "Test"` flag
4. Verify content detection logic with mock git tags
5. Manually verify emails in both plain text and HTML

### Cloudflare Migration

1. Set up Cloudflare Pages project
2. Configure environment variables
3. Test deployment on preview branch
4. Verify subscription endpoint works
5. Update DNS to point domain to Cloudflare Pages
6. Keep GitHub Pages as temporary fallback

### First Newsletter Send

Since no `newsletter/*` tags exist initially, options:
- Send "welcome/catch-up" newsletter with all published content
- Create manual `newsletter/2025-01-01` tag to mark starting point

### Verification

After each send:
- Verify git tag was created with correct annotation
- Check Resend dashboard for delivery status
- Send test email to yourself first

## Implementation Checklist

- [ ] Install `resend` and `@astrojs/cloudflare` packages
- [ ] Configure Astro for hybrid mode
- [ ] Create subscription form component
- [ ] Implement `/api/subscribe` endpoint
- [ ] Create newsletter script with content detection
- [ ] Implement editor integration for personal notes
- [ ] Add `--message` flag support
- [ ] Set up email templates (plain text + HTML)
- [ ] Create GitHub Action workflow
- [ ] Set up Cloudflare Pages project
- [ ] Configure environment variables (local + Cloudflare + GitHub)
- [ ] Create Resend account and segment
- [ ] Test subscription flow locally
- [ ] Test newsletter script locally
- [ ] Deploy to Cloudflare Pages
- [ ] Update DNS settings
- [ ] Send test newsletter
- [ ] Document usage in README

## Future Enhancements

Potential improvements for later:
- Unsubscribe link/page
- Subscriber count display
- Newsletter archive page on website
- Analytics on open rates
- RSS feed as alternative to email
- Preview newsletter before sending
- Schedule sends for specific times
