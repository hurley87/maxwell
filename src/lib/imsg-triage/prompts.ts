export const CLASSIFICATION_PROMPT = `
Analyze this iMessage/SMS and classify it into one of four categories:

1. needs_response - The sender expects or needs a reply from me. Indicators:
   - Direct questions addressed to recipient
   - Requests for action, input, or decisions
   - Time-sensitive messages
   - Messages expecting engagement or confirmation

2. informational - Useful information but no response needed. Indicators:
   - Updates or announcements
   - Links or resources shared
   - FYI messages
   - Status updates

3. personal - Casual chat, check-ins, or social messages. Indicators:
   - Friendly check-ins
   - Casual conversation
   - Social messages from friends/family
   - Low-urgency personal communication

4. ignorable - Can safely skip without action. Indicators:
   - Group chat noise
   - Automated messages
   - Spam or promotional content
   - Messages already acknowledged

Message Context:
Chat: {{chatName}} ({{identifier}})
From: {{sender}}
Date: {{date}}
Text: {{text}}
{{attachments}}

Respond with JSON only:
{
  "category": "needs_response" | "informational" | "personal" | "ignorable",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why this classification",
  "urgency": "high" | "medium" | "low"  // only include if needs_response
}
`;

export const SUMMARY_PROMPT = `
Summarize this iMessage/SMS in 1-2 concise sentences. Focus on the key information or updates mentioned.

Chat: {{chatName}}
From: {{sender}}
Text: {{text}}
{{attachments}}

Provide only the summary, no preamble.
`;

export const REPLY_PROMPT = `
Draft a reply to this iMessage/SMS. Match the tone and formality of the original sender and the relationship context.

Original Message:
Chat: {{chatName}}
From: {{sender}}
Text: {{text}}
{{attachments}}

Classification reasoning: {{reasoning}}

Write a helpful, concise reply in my style:
- Keep it short (usually 1-3 sentences for text messages).
- Match the sender's tone (casual for friends, more formal for professional contacts).
- Be direct and natural - text messages are conversational.
- Avoid overly formal language unless the context requires it.
- Use appropriate emoji sparingly if the conversation style supports it.

Respond with JSON:
{
  "content": "the reply text",
  "tone": "casual" | "professional" | "friendly"
}
`;
