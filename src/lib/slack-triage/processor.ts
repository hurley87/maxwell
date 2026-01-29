import OpenAI from 'openai';
import { SlackMessage, Classification } from './types';
import { SUMMARY_PROMPT, REPLY_PROMPT } from './prompts';
import { getOpik } from './opik-client';

// Lazy-initialize OpenAI client to ensure env vars are loaded
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Generates a concise summary for an informational message.
 * Creates an Opik span to trace the summary generation.
 */
export async function generateSummary(
  message: SlackMessage,
  trace: ReturnType<ReturnType<typeof getOpik>['trace']>
): Promise<string> {
  const openai = getOpenAI();
  const prompt = SUMMARY_PROMPT
    .replace('{{channel}}', message.channel)
    .replace('{{user}}', message.user)
    .replace('{{text}}', message.text.slice(0, 2000));

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.5,
    });

    const summary = response.choices[0]?.message?.content?.trim();
    if (!summary) {
      throw new Error('No summary generated');
    }

    // Create span with input and output after the operation completes
    const summarySpan = trace.span({
      name: 'generate_summary',
      type: 'llm',
      input: {
        channel: message.channel,
        user: message.user,
        messageId: message.ts,
      },
      output: { summary },
      metadata: {
        messageId: message.ts,
        model: 'gpt-4o-mini',
        tokensUsed: response.usage?.total_tokens,
      },
    });

    summarySpan.end();

    return summary;
  } catch (error) {
    // Create span with error information
    const errorSpan = trace.span({
      name: 'generate_summary',
      type: 'llm',
      input: {
        channel: message.channel,
        user: message.user,
        messageId: message.ts,
      },
      output: {},
      metadata: {
        messageId: message.ts,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    errorSpan.end();
    throw error;
  }
}

/**
 * Generates a draft reply for a message that needs a response.
 * Creates an Opik span to trace the reply generation.
 */
export async function generateReplyDraft(
  message: SlackMessage,
  classification: Classification,
  trace: ReturnType<ReturnType<typeof getOpik>['trace']>
): Promise<{ content: string; tone: string }> {
  const openai = getOpenAI();
  const isThread = !!message.threadTs;
  
  const prompt = REPLY_PROMPT
    .replace('{{channel}}', message.channel)
    .replace('{{user}}', message.user)
    .replace('{{text}}', message.text.slice(0, 2000))
    .replace('{{isThread}}', isThread ? 'yes' : 'no')
    .replace('{{reasoning}}', classification.reasoning);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.7, // Slightly higher for more natural replies
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse JSON response
    let reply: { content: string; tone: string };
    try {
      reply = JSON.parse(content) as { content: string; tone: string };
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in reply response');
      }
      reply = JSON.parse(jsonMatch[0]) as { content: string; tone: string };
    }

    if (!reply.content || !reply.tone) {
      throw new Error('Invalid reply format: missing content or tone');
    }

    // Create span with input and output after the operation completes
    const replySpan = trace.span({
      name: 'generate_reply_draft',
      type: 'llm',
      input: {
        channel: message.channel,
        user: message.user,
        messageId: message.ts,
        category: classification.category,
        urgency: classification.urgency,
        isThread,
      },
      output: {
        content: reply.content,
        tone: reply.tone,
      },
      metadata: {
        messageId: message.ts,
        model: 'gpt-4o-mini',
        tokensUsed: response.usage?.total_tokens,
      },
    });

    replySpan.end();

    return reply;
  } catch (error) {
    // Create span with error information
    const errorSpan = trace.span({
      name: 'generate_reply_draft',
      type: 'llm',
      input: {
        channel: message.channel,
        user: message.user,
        messageId: message.ts,
        category: classification.category,
        urgency: classification.urgency,
      },
      output: {},
      metadata: {
        messageId: message.ts,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    errorSpan.end();
    throw error;
  }
}
