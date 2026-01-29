export const CLASSIFICATION_PROMPT = `
Analyze this Slack message and classify it into one of four categories:

1. needs_response - The message requires or expects a reply from me. Indicators:
   - Direct mention of my user ID (@me)
   - Direct questions addressed to me
   - Requests for my input, action, or decisions
   - Messages in threads where I'm expected to respond
   - High reply_count but no response from me yet

2. mention - I'm mentioned but it's informational or doesn't require action. Indicators:
   - Mentioned in a group context (e.g., "@channel" or "@here" that includes me)
   - Mentioned but the message is just an FYI
   - Mentioned in a discussion where others are responding

3. informational - Useful information but no response needed. Indicators:
   - Team updates or announcements
   - Status updates or progress reports
   - Links or resources shared
   - Automated notifications that are useful
   - General discussions I should be aware of

4. ignorable - Can safely skip without action. Indicators:
   - Bot messages or automated notifications
   - Low-priority noise
   - Messages in channels I'm not actively following
   - Already acknowledged (has ✅ reaction)

Message Context:
Channel: {{channel}}
User: {{user}}
Text: {{text}}
Timestamp: {{ts}}
Thread: {{isThread}}
Reply Count: {{replyCount}}
Has Reactions: {{hasReactions}}
Mentions Me: {{mentionsMe}}

Respond with JSON only:
{
  "category": "needs_response" | "informational" | "mention" | "ignorable",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why this classification",
  "urgency": "high" | "medium" | "low"  // only include if needs_response
}
`;

export const SUMMARY_PROMPT = `
Summarize this Slack message in 1-2 concise sentences. Focus on the key information or action items mentioned.

Channel: {{channel}}
User: {{user}}
Text: {{text}}

Provide only the summary, no preamble.
`;

export const REPLY_PROMPT = `
Draft a reply to this Slack message. Match the tone and formality of Slack communication (usually casual/professional).

Message Context:
Channel: {{channel}}
User: {{user}}
Text: {{text}}
Thread: {{isThread}}

Classification reasoning: {{reasoning}}

Write a helpful, concise reply in my style:
- Keep it short (usually 1-3 sentences).
- Prefer direct phrasing. Avoid filler.
- Match the casual tone of Slack.
- Use Slack conventions (e.g., emoji sparingly, threads for replies).
- Ask direct questions when needed.

Respond with JSON:
{
  "content": "the reply text",
  "tone": "casual" | "professional" | "friendly"
}
`;
