import OpenAI from 'openai';
import { IMessage, Chat, Classification } from './types';
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
 * Formats attachment information for the prompt.
 */
function formatAttachments(message: IMessage): string {
  if (!message.attachments || message.attachments.length === 0) {
    return '';
  }

  const attInfo = message.attachments.map((att) => {
    const parts: string[] = [];
    if (att.filename) parts.push(`filename: ${att.filename}`);
    if (att.mimeType) parts.push(`type: ${att.mimeType}`);
    if (att.isSticker) parts.push('(sticker)');
    return parts.join(', ');
  });

  return `Attachments: ${attInfo.join('; ')}`;
}

/**
 * Generates a concise summary for an informational message.
 * Creates an Opik span to trace the summary generation.
 */
export async function generateSummary(
  message: IMessage,
  chat: Chat,
  trace: ReturnType<ReturnType<typeof getOpik>['trace']>
): Promise<string> {
  const openai = getOpenAI();
  const attachmentsInfo = formatAttachments(message);
  
  const prompt = SUMMARY_PROMPT
    .replace('{{chatName}}', chat.name)
    .replace('{{sender}}', message.sender || 'Me')
    .replace('{{text}}', message.text.slice(0, 2000))
    .replace('{{attachments}}', attachmentsInfo || 'No attachments');

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
        chatName: chat.name,
        sender: message.sender,
        messageId: message.id,
      },
      output: { summary },
      metadata: {
        messageId: message.id,
        chatId: chat.id,
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
        chatName: chat.name,
        sender: message.sender,
        messageId: message.id,
      },
      output: {},
      metadata: {
        messageId: message.id,
        chatId: chat.id,
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
  message: IMessage,
  chat: Chat,
  classification: Classification,
  trace: ReturnType<ReturnType<typeof getOpik>['trace']>
): Promise<{ content: string; tone: string }> {
  const openai = getOpenAI();
  const attachmentsInfo = formatAttachments(message);
  
  const prompt = REPLY_PROMPT
    .replace('{{chatName}}', chat.name)
    .replace('{{sender}}', message.sender || 'Me')
    .replace('{{text}}', message.text.slice(0, 2000))
    .replace('{{attachments}}', attachmentsInfo || 'No attachments')
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
      max_tokens: 500, // Shorter for text messages
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
        chatName: chat.name,
        sender: message.sender,
        messageId: message.id,
        category: classification.category,
        urgency: classification.urgency,
      },
      output: {
        content: reply.content,
        tone: reply.tone,
      },
      metadata: {
        messageId: message.id,
        chatId: chat.id,
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
        chatName: chat.name,
        sender: message.sender,
        messageId: message.id,
        category: classification.category,
        urgency: classification.urgency,
      },
      output: {},
      metadata: {
        messageId: message.id,
        chatId: chat.id,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    errorSpan.end();
    throw error;
  }
}
