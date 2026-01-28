export const CLASSIFICATION_PROMPT = `
Analyze this email and classify it into one of four categories:

1. needs_response - The sender expects or needs a reply from me. Indicators:
   - Direct questions addressed to recipient
   - Requests for action, input, or decisions
   - Meeting requests or scheduling
   - Personal messages expecting engagement

2. informational - Useful information but no response needed. Indicators:
   - Important automated notifications (shipping, receipts, security alerts)
   - FYI messages explicitly marked as no-reply-needed
   - Company or team announcements
   - Updates I actively want to receive

3. unsubscribe - Newsletters or recurring emails I might want to stop receiving. Indicators:
   - Marketing newsletters
   - Promotional content
   - Digest emails from services I may not actively use
   - Recurring updates that add little value
   - Contains an unsubscribe link

4. ignorable - Can safely skip or archive without action. Indicators:
   - Automated reminders handled elsewhere
   - Low-priority noise
   - Spam-like content

Email:
From: {{from}}
Subject: {{subject}}
Date: {{date}}
Body:
{{body}}

Respond with JSON only:
{
  "category": "needs_response" | "informational" | "unsubscribe" | "ignorable",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why this classification",
  "urgency": "high" | "medium" | "low",  // only include if needs_response
  "unsubscribeUrl": "extracted unsubscribe URL"  // only include if unsubscribe category and URL found in email
}
`;

export const SUMMARY_PROMPT = `
Summarize this email in 1-2 concise sentences. Focus on the key information or action items mentioned.

From: {{from}}
Subject: {{subject}}
Body:
{{body}}

Provide only the summary, no preamble.
`;

export const REPLY_PROMPT = `
Draft a reply to this email. Match the tone and formality of the original sender.

Original Email:
From: {{from}}
Subject: {{subject}}
Body:
{{body}}

Classification reasoning: {{reasoning}}

Write a helpful, concise reply. Respond with JSON:
{
  "content": "the reply text",
  "tone": "formal" | "casual" | "professional"
}
`;
