---
name: email
description: Review and triage unread emails, classifying them and generating summaries or draft replies.
---

# Email Triage Skill

Helps review unread emails by classifying them into four categories:
- **needs_response** - Emails requiring a reply (generates draft)
- **informational** - FYI emails (generates summary)
- **unsubscribe** - Newsletters/marketing I might want to stop receiving (includes unsubscribe URL)
- **ignorable** - Low-priority, can skip

## Prerequisites

- `gog` CLI configured with Gmail access
- `OPENAI_API_KEY` environment variable set
- `OPIK_API_KEY` environment variable set (optional, for observability)
- Dev server running (`pnpm dev`)

## Usage

### Run Email Triage

Call the API endpoint:

```bash
curl "http://localhost:3000/api/email/triage"
```

Query parameters:
- `hours` - Look back N hours (default: 24, max: 168)
- `max` - Maximum emails to process (default: 50, max: 100)
- `account` - Specific Gmail account to use

Examples:
```bash
# Last 24 hours (default)
curl "http://localhost:3000/api/email/triage"

# Last 8 hours, max 20 emails
curl "http://localhost:3000/api/email/triage?hours=8&max=20"

# Specific account
curl "http://localhost:3000/api/email/triage?account=user@example.com"
```

### Interpreting Results

Present results to the user in this format:

**Needs Response (N emails)**
For each, show:
- From, Subject, Urgency (if provided)
- Why it needs response (reasoning from classification)
- Suggested reply (offer to save as draft)

**Informational (N emails)**  
For each, show:
- From, Subject
- Summary

**Unsubscribe Candidates (N emails)**
For each, show:
- From, Subject
- Why it's a candidate for unsubscribe (reasoning)
- Ask user: "Would you like me to unsubscribe from any of these?"

**Ignorable (N emails)**
Just list count, optionally list subjects if user asks.

### Unsubscribing

IMPORTANT: Always ask the user before unsubscribing. Never unsubscribe automatically.

When user confirms they want to unsubscribe:
1. Use the `unsubscribeUrl` from the classification if available
2. If no URL in classification, extract from the email body (look for "unsubscribe" links)
3. Fetch the unsubscribe URL to trigger the unsubscribe:

```bash
curl -L -s -o /dev/null -w "%{http_code}" "UNSUBSCRIBE_URL"
```

A 200 response typically means success. Report the result to the user.

### Creating Gmail Drafts

If user wants to save a suggested reply as a draft:

```bash
gog gmail drafts create \
  --to "recipient@example.com" \
  --subject "Re: Original Subject" \
  --body-file - <<'EOF'
Draft content here
EOF
```

Or use stdin:

```bash
echo "Draft content" | gog gmail drafts create \
  --to "recipient@example.com" \
  --subject "Re: Original Subject" \
  --body-file -
```

### Example Workflow

1. User says "check my email" or "morning email review"
2. Call the API: `curl "http://localhost:3000/api/email/triage?hours=24"`
3. Parse the JSON output
4. Present findings conversationally:

   "You have 23 unread emails from the last 24 hours:

   **3 need your response:**
   1. **John Smith** - 'Q4 Budget Review' (high urgency)
      He's asking for your input on the Q3 actuals before Friday.
      *Suggested reply:* 'Hi John, I'll review the Q3 numbers...'
   
   2. **Sarah Chen** - 'Project Timeline' (medium urgency)
      Needs confirmation on delivery date.
      *Suggested reply:* 'Hi Sarah, thanks for the update...'
   
   3. **Mike Johnson** - 'Quick question' (low urgency)
      Technical question about API.
      *Suggested reply:* 'Hi Mike, here's how that works...'

   **5 informational:**
   - **AWS Billing** - Monthly bill $247, up 12% from last month
   - **GitHub** - 3 PRs merged in your repos this week
   - ...

   **3 unsubscribe candidates:**
   - **Marketing Weekly** - Another promotional digest
   - **Product Updates** - Feature announcements you rarely read
   - **Industry Newsletter** - Generic content

   Would you like me to unsubscribe from any of these?

   **12 ignorable** (spam, automated notifications)

   Would you like me to save any of these draft replies to Gmail?"

## Notes

- API endpoint: `GET /api/email/triage`
- Uses GPT-4o-mini for classification and generation (fast and cost-effective)
- Each email classification includes confidence score and reasoning
- Processing ~50 emails takes roughly 30-60 seconds
- API has 2-minute timeout (`maxDuration: 120`)
- Costs approximately $0.10-0.20 per run (depends on email lengths)
- All operations are traced with Opik for observability - check the Opik dashboard to see:
  - Individual email classifications
  - Token usage and costs
  - Latency metrics
  - Full input/output for debugging

## Error Handling

If API returns connection error:
- Ensure dev server is running: `pnpm dev`
- Check server is on port 3000

If API returns 400 error:
- `hours` must be between 1 and 168
- `max` must be between 1 and 100

If API returns 500 error:
- Check `gog` CLI is configured: `gog auth list`
- Verify `OPENAI_API_KEY` is set in `.env.local`
- Check server logs for detailed error message

If Opik tracing fails:
- System will continue working, just without observability
- Check `OPIK_API_KEY` and `OPIK_URL_OVERRIDE` if using self-hosted
