---
name: slack
description: Review and triage Slack messages, classifying them and generating summaries or draft replies.
---

# Slack Triage Skill

Review and triage Slack messages.

## Prerequisites
- Slack app with User OAuth token (`xoxp-`)
- Environment variables: `SLACK_USER_TOKEN`, `SLACK_USER_ID`, `SLACK_CHANNELS`
- Dev server running (`pnpm dev`)

## Usage

### Triage Messages
```bash
curl "http://localhost:3000/api/slack/triage?hours=8"
```

Parameters:
- `hours` - Look back N hours (default: 8, max: 48)
- `limit` - Max messages per channel (default: 50, max: 200)
- `channels` - Comma-separated channel IDs

### Send Message
```bash
curl -X POST "http://localhost:3000/api/slack/messages" \
  -H "Content-Type: application/json" \
  -d '{"channel": "C123", "text": "Message text", "threadTs": "1234567890.123456"}'
```

### Add Reaction
```bash
curl -X POST "http://localhost:3000/api/slack/react" \
  -H "Content-Type: application/json" \
  -d '{"channel": "C123", "timestamp": "1234567890.123456", "emoji": "white_check_mark"}'
```

### Log Actions
```bash
curl -X POST "http://localhost:3000/api/slack/log" \
  -H "Content-Type: application/json" \
  -d '{"action": "replied", "channel": "general", "user": "John", "text": "Message preview"}'
```

Actions: `replied`, `reacted`, `acknowledged`

## Classification Categories
- **needs_response** - Messages requiring a reply
- **mention** - You're mentioned but informational
- **informational** - Team updates, FYI
- **ignorable** - Bot messages, already acknowledged

## Workflow
1. Call triage API
2. Present findings by category
3. When user takes action, perform it AND log it
