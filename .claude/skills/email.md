---
name: email
description: Review and triage unread emails, classifying them and generating summaries or draft replies.
---

# Email Triage Skill

Review and triage unread emails.

## Prerequisites
- `gog` CLI configured with Gmail access
- Dev server running (`pnpm dev`)

## Usage

### Triage Emails
```bash
curl "http://localhost:3000/api/email/triage?hours=24"
```

Parameters:
- `hours` - Look back N hours (default: 24, max: 168)
- `max` - Max emails to process (default: 50, max: 100)
- `account` - Specific Gmail account

### Create Draft Reply
```bash
gog gmail drafts create \
  --to "recipient@example.com" \
  --subject "Re: Original Subject" \
  --body-file - <<'EOF'
Draft content here

Thanks,
EOF
```

### Log Actions
```bash
curl -X POST "http://localhost:3000/api/email/log" \
  -H "Content-Type: application/json" \
  -d '{"action": "draft_created", "from": "Sender Name", "subject": "Email Subject"}'
```

Actions: `unsubscribe`, `draft_created`, `reply_sent`, `archived`, `labeled`

## Classification Categories
- **needs_response** - Emails requiring a reply
- **informational** - FYI emails
- **unsubscribe** - Newsletters to potentially stop
- **ignorable** - Low-priority, can skip

## Draft Style
- Close with "Thanks," (not "Best regards,")

## Workflow
1. Call triage API
2. Present findings by category
3. When user takes action, perform it AND log it
