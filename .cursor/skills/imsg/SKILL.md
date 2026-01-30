---
name: imsg
description: Review and triage iMessage/SMS messages, classifying them and generating summaries or draft replies.
homepage: https://imsg.to
metadata: {"clawdbot":{"emoji":"📨","os":["darwin"],"requires":{"bins":["imsg"]},"install":[{"id":"brew","kind":"brew","formula":"steipete/tap/imsg","bins":["imsg"],"label":"Install imsg (brew)"}]}}
---

# iMessage Triage Skill

Helps review iMessage/SMS messages by classifying them into four categories:
- **needs_response** - Messages requiring a reply (generates draft)
- **informational** - Updates, links shared, FYI messages
- **personal** - Casual chat, check-ins, social messages
- **ignorable** - Group noise, spam, automated messages

## Prerequisites

- `imsg` CLI installed (`brew install steipete/tap/imsg`)
- Messages.app signed in
- Full Disk Access for your terminal (to read `~/Library/Messages/chat.db`)
- Automation permission to control Messages.app (for sending)
- `OPENAI_API_KEY` environment variable set
- `OPIK_API_KEY` environment variable set (optional, for observability)
- Dev server running (`pnpm dev`)

## Usage

### Run iMessage Triage

Call the API endpoint:

```bash
curl "http://localhost:3000/api/imsg/triage"
```

Query parameters:
- `hours` - Look back N hours (default: 8, max: 168)
- `limit` - Maximum messages per chat (default: 20, max: 100)
- `chatIds` - Comma-separated chat IDs to filter (optional)

Examples:
```bash
# Last 8 hours (default)
curl "http://localhost:3000/api/imsg/triage"

# Last 24 hours, max 30 messages per chat
curl "http://localhost:3000/api/imsg/triage?hours=24&limit=30"

# Specific chats only
curl "http://localhost:3000/api/imsg/triage?chatIds=1,5,12"
```

### Interpreting Results

Present results to the user in this format:

**Needs Response (N messages)**
For each, show:
- Contact name, Urgency (if provided)
- Why it needs response (reasoning from classification)
- Suggested reply (offer to send)

**Informational (N messages)**  
For each, show:
- Contact name
- Summary

**Personal (N messages)**
For each, show:
- Contact name
- Summary (optional, can skip if user prefers)

**Ignorable (N messages)**
Just list count, optionally list contacts if user asks.

### Sending Messages

To send a reply to a contact:

```bash
curl -X POST "http://localhost:3000/api/imsg/send" \
  -H "Content-Type: application/json" \
  -d '{"to": "+14155551212", "text": "Thanks for the update!", "service": "auto"}'
```

- `to` - Phone number or email address (required)
- `text` - Message text (required)
- `service` - `imessage` | `sms` | `auto` (optional, default: `auto`)

**IMPORTANT**: Always confirm recipient and message content before sending. Never send messages automatically without user approval.

### Logging iMessage Actions

**IMPORTANT**: After ANY iMessage action (reply sent, message acknowledged), log it so it becomes a memory.

Call the logging endpoint:

```bash
curl -X POST "http://localhost:3000/api/imsg/log" \
  -H "Content-Type: application/json" \
  -d '{"action": "ACTION_TYPE", "contact": "Contact Name", "summary": "Brief summary"}'
```

Action types:
- `replied` - Sent a reply to a message
- `acknowledged` - Acknowledged a message

Examples:

```bash
# Log a reply
curl -X POST "http://localhost:3000/api/imsg/log" \
  -H "Content-Type: application/json" \
  -d '{"action": "replied", "contact": "John Smith", "summary": "Confirmed meeting time"}'

# Log an acknowledgment
curl -X POST "http://localhost:3000/api/imsg/log" \
  -H "Content-Type: application/json" \
  -d '{"action": "acknowledged", "contact": "Sarah Chen", "summary": "Received project update"}'
```

The action is logged to today's daily notes under "## iMessage Actions" and will be indexed by the memory system.

### Example Workflow

1. User says "check my messages" or "morning message review"
2. Call the API: `curl "http://localhost:3000/api/imsg/triage?hours=8"`
3. Parse the JSON output
4. Present findings conversationally
5. When user takes action (reply, acknowledge, etc.), perform the action AND log it

   "You have 12 messages from the last 8 hours:

   **3 need your response:**
   1. **John Smith** (high urgency)
      He's asking if you're free for a call this afternoon.
      *Suggested reply:* 'Yes, I'm free after 2pm. What time works for you?'
   
   2. **Sarah Chen** (medium urgency)
      Needs confirmation on the project deadline.
      *Suggested reply:* 'We can have it ready by Friday. I'll send updates as we progress.'
   
   3. **Mike Johnson** (low urgency)
      Question about the weekend plans.
      *Suggested reply:* 'Sounds good! I'll confirm details tomorrow.'

   **4 informational:**
   - **Alice** - Shared a link to an interesting article
   - **Bob** - Sent a photo from the event
   - **Charlie** - Status update on the project
   - **Diana** - Reminder about upcoming meeting

   **3 personal:**
   - **Emma** - Casual check-in
   - **Frank** - Friendly message
   - **Grace** - Social update

   **2 ignorable** (group chat noise, automated messages)

   Would you like me to send any of these replies?"

## Direct imsg CLI Usage

For direct CLI access (outside of triage):

**List chats:**
```bash
imsg chats --limit 10 --json
```

**View chat history:**
```bash
imsg history --chat-id 1 --limit 20 --attachments --json
```

**Watch for new messages:**
```bash
imsg watch --chat-id 1 --attachments
```

**Send a message:**
```bash
imsg send --to "+14155551212" --text "hi" --file /path/pic.jpg --service imessage
```

**Service options:**
- `--service imessage` - Force iMessage delivery
- `--service sms` - Force SMS delivery
- `--service auto` - Let system choose (default)

## Notes

- API endpoint: `GET /api/imsg/triage`
- Uses GPT-4o-mini for classification and generation (fast and cost-effective)
- Each message classification includes confidence score and reasoning
- Processing ~20 messages takes roughly 20-40 seconds
- API has 2-minute timeout (`maxDuration: 120`)
- Costs approximately $0.05-0.15 per run (depends on message lengths)
- Messages are filtered to exclude your own messages (`isFromMe: false`)
- Messages are filtered by time window (default: last 8 hours)
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
- `hours` must be between 1 and 168
- `limit` must be between 1 and 100

If API returns 500 error:
- Check `imsg` CLI is installed: `which imsg`
- Verify Messages.app is signed in
- Verify Full Disk Access is granted to your terminal
- Verify `OPENAI_API_KEY` is set in `.env.local`
- Check server logs for detailed error message
- Ensure `imsg` has proper permissions (see Prerequisites)

If imsg CLI fails:
- Grant Full Disk Access: System Settings > Privacy & Security > Full Disk Access > add Terminal
- Grant Automation permission: System Settings > Privacy & Security > Automation > allow Terminal to control Messages.app
- Verify Messages.app is signed in and `~/Library/Messages/chat.db` exists

If Opik tracing fails:
- System will continue working, just without observability
- Check `OPIK_API_KEY` and `OPIK_URL_OVERRIDE` if using self-hosted
