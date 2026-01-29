---
name: slack
description: Review and triage Slack messages, classifying them and generating summaries or draft replies.
---

# Slack Triage Skill

Helps review Slack messages by classifying them into four categories:
- **needs_response** - Messages requiring a reply (generates draft)
- **mention** - You're mentioned but it's informational
- **informational** - Team updates, FYI messages
- **ignorable** - Bot messages, automated notifications, already acknowledged

## Prerequisites

- Slack app created at https://api.slack.com/apps
- User OAuth token configured (starts with `xoxp-`)
- Required scopes added under **User Token Scopes**:
  - `channels:history`, `channels:read` - Read public channels
  - `groups:history`, `groups:read` - Read private channels (optional)
  - `chat:write` - Send messages as yourself
  - `reactions:write`, `reactions:read` - Manage reactions
  - `users:read` - Get user info
- `SLACK_USER_TOKEN` environment variable set (User OAuth Token)
- `SLACK_USER_ID` environment variable set (your Slack user ID)
- `SLACK_CHANNELS` environment variable set (comma-separated channel IDs)
- `OPENAI_API_KEY` environment variable set
- `OPIK_API_KEY` environment variable set (optional, for observability)
- Dev server running (`pnpm dev`)

## Usage

### Run Slack Triage

Call the API endpoint:

```bash
curl "http://localhost:3000/api/slack/triage"
```

Query parameters:
- `hours` - Look back N hours (default: 8, max: 48)
- `limit` - Maximum messages per channel (default: 50, max: 200)
- `channels` - Comma-separated channel IDs (optional, defaults to SLACK_CHANNELS env var)
- `after` - Timestamp to fetch messages after (optional, overrides hours)

Examples:
```bash
# Last 8 hours (default)
curl "http://localhost:3000/api/slack/triage"

# Last 4 hours, max 30 messages per channel
curl "http://localhost:3000/api/slack/triage?hours=4&limit=30"

# Specific channels
curl "http://localhost:3000/api/slack/triage?channels=C123,C456"
```

### Interpreting Results

Present results to the user in this format:

**Needs Response (N messages)**
For each, show:
- Channel, User, Urgency (if provided)
- Why it needs response (reasoning from classification)
- Suggested reply (offer to send)

**Mention (N messages)**
For each, show:
- Channel, User
- Why you're mentioned (reasoning)
- Summary if informational

**Informational (N messages)**  
For each, show:
- Channel, User
- Summary

**Ignorable (N messages)**
Just list count, optionally list channels/users if user asks.

### Sending Messages

To send a reply to a message:

```bash
curl -X POST "http://localhost:3000/api/slack/messages" \
  -H "Content-Type: application/json" \
  -d '{"channel": "C123", "text": "Thanks for the update!", "threadTs": "1234567890.123456"}'
```

- `channel` - Channel ID (required)
- `text` - Message text (required)
- `threadTs` - Thread timestamp to reply in thread (optional)

### Adding Reactions

To add a reaction (e.g., ✅ to acknowledge):

```bash
curl -X POST "http://localhost:3000/api/slack/react" \
  -H "Content-Type: application/json" \
  -d '{"channel": "C123", "timestamp": "1234567890.123456", "emoji": "white_check_mark"}'
```

- `channel` - Channel ID (required)
- `timestamp` - Message timestamp (required)
- `emoji` - Emoji name (e.g., "white_check_mark", "thumbsup") or Unicode (e.g., "👍")

### Logging Slack Actions

**IMPORTANT**: After ANY Slack action (reply sent, reaction added, message acknowledged), log it so it becomes a memory.

Call the logging endpoint:

```bash
curl -X POST "http://localhost:3000/api/slack/log" \
  -H "Content-Type: application/json" \
  -d '{"action": "ACTION_TYPE", "channel": "Channel Name", "user": "User Name", "text": "Message preview"}'
```

Action types:
- `replied` - Sent a reply to a message
- `reacted` - Added a reaction (use `details` for emoji name)
- `acknowledged` - Acknowledged a message (e.g., with ✅ reaction)

Examples:

```bash
# Log a reply
curl -X POST "http://localhost:3000/api/slack/log" \
  -H "Content-Type: application/json" \
  -d '{"action": "replied", "channel": "general", "user": "John", "text": "Thanks for the update!"}'

# Log a reaction
curl -X POST "http://localhost:3000/api/slack/log" \
  -H "Content-Type: application/json" \
  -d '{"action": "reacted", "channel": "general", "user": "Sarah", "details": "white_check_mark"}'
```

The action is logged to today's daily notes under "## Slack Actions" and will be indexed by the memory system.

### Example Workflow

1. User says "check my Slack" or "morning Slack review"
2. Call the API: `curl "http://localhost:3000/api/slack/triage?hours=8"`
3. Parse the JSON output
4. Present findings conversationally
5. When user takes action (reply, react, etc.), perform the action AND log it

   "You have 15 messages from the last 8 hours:

   **3 need your response:**
   1. **#general** - **John Smith** (high urgency)
      He's asking for your input on the Q3 budget before Friday.
      *Suggested reply:* 'Thanks John, I'll review the Q3 numbers and get back to you by Thursday.'
   
   2. **#engineering** - **Sarah Chen** (medium urgency)
      Needs confirmation on deployment timeline.
      *Suggested reply:* 'We can deploy next week. I'll send the timeline details shortly.'
   
   3. **#design** - **Mike Johnson** (low urgency)
      Question about the new component design.
      *Suggested reply:* 'The component follows our design system. Here's the link...'

   **2 mentions:**
   - **#team** - **Alice** mentioned you in a discussion about the project roadmap
   - **#updates** - **Bob** mentioned you in a status update (informational)

   **5 informational:**
   - **#engineering** - Deployment completed successfully
   - **#design** - New design system components released
   - ...

   **5 ignorable** (bot messages, already acknowledged)

   Would you like me to send any of these replies? Or add ✅ reactions to acknowledge?"

## Notes

- API endpoint: `GET /api/slack/triage`
- Uses GPT-4o-mini for classification and generation (fast and cost-effective)
- Each message classification includes confidence score and reasoning
- Processing ~50 messages takes roughly 30-60 seconds
- API has 2-minute timeout (`maxDuration: 120`)
- Costs approximately $0.10-0.20 per run (depends on message lengths)
- Messages are filtered to exclude your own messages
- Messages with ✅ reaction are automatically classified as ignorable
- All operations are traced with Opik for observability - check the Opik dashboard to see:
  - Individual message classifications
  - Token usage and costs
  - Latency metrics
  - Full input/output for debugging

## Error Handling

If API returns connection error:
- Ensure dev server is running: `pnpm dev`
- Check server is on port 3000

If API returns 400 error:
- `hours` must be between 1 and 48
- `limit` must be between 1 and 200
- `channel` parameter required for messages/react endpoints

If API returns 500 error:
- Check `SLACK_USER_TOKEN` is set in `.env.local`
- Verify `SLACK_USER_ID` is set correctly
- Verify `SLACK_CHANNELS` is set (or pass channels parameter)
- Verify `OPENAI_API_KEY` is set in `.env.local`
- Check server logs for detailed error message
- Ensure Slack app has required scopes installed

If Opik tracing fails:
- System will continue working, just without observability
- Check `OPIK_API_KEY` and `OPIK_URL_OVERRIDE` if using self-hosted
