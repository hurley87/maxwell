---
name: imsg
description: Review and triage iMessage/SMS messages, classifying them and generating summaries or draft replies.
---

# iMessage Triage Skill

Review and triage iMessage/SMS messages.

## Prerequisites
- `imsg` CLI installed (`brew install steipete/tap/imsg`)
- Dev server running (`pnpm dev`)

## Usage

### Triage Messages
```bash
curl "http://localhost:3000/api/imsg/triage?hours=8"
```

Parameters:
- `hours` - Look back N hours (default: 8, max: 168)
- `limit` - Max messages per chat (default: 20, max: 100)

### Send Message
```bash
curl -X POST "http://localhost:3000/api/imsg/send" \
  -H "Content-Type: application/json" \
  -d '{"to": "+14155551212", "text": "Message text", "service": "auto"}'
```

**IMPORTANT**: Always confirm before sending.

### Log Actions
```bash
curl -X POST "http://localhost:3000/api/imsg/log" \
  -H "Content-Type: application/json" \
  -d '{"action": "replied", "contact": "Contact Name", "summary": "Brief summary"}'
```

Actions: `replied`, `acknowledged`

## Classification Categories
- **needs_response** - Messages requiring a reply
- **informational** - Updates, links shared, FYI messages
- **personal** - Casual chat, check-ins
- **ignorable** - Group noise, spam, automated

## Workflow
1. Call triage API
2. Present findings by category
3. When user takes action, perform it AND log it
