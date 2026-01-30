import OpenAI from 'openai';
import { IMessage, Chat, Classification } from './types';
import { CLASSIFICATION_PROMPT } from './prompts';
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
    if (att.missing) parts.push('(missing)');
    return parts.join(', ');
  });

  return `Attachments: ${attInfo.join('; ')}`;
}

/**
 * Classifies an iMessage into one of four categories using LLM.
 * Creates an Opik span to trace the classification decision.
 */
export async function classifyMessage(
  message: IMessage,
  chat: Chat,
  trace: ReturnType<ReturnType<typeof getOpik>['trace']>
): Promise<Classification> {
  const openai = getOpenAI();
  
  const attachmentsInfo = formatAttachments(message);
  const prompt = CLASSIFICATION_PROMPT
    .replace('{{chatName}}', chat.name)
    .replace('{{identifier}}', chat.identifier)
    .replace('{{sender}}', message.sender || 'Me')
    .replace('{{date}}', message.createdAt)
    .replace('{{text}}', message.text.slice(0, 2000)) // Truncate for token efficiency
    .replace('{{attachments}}', attachmentsInfo || 'No attachments');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective for classification
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent classification
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse JSON response
    let classification: Classification;
    try {
      classification = JSON.parse(content) as Classification;
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in classification response');
      }
      classification = JSON.parse(jsonMatch[0]) as Classification;
    }

    // Validate classification
    if (
      !['needs_response', 'informational', 'personal', 'ignorable'].includes(
        classification.category
      )
    ) {
      throw new Error(`Invalid category: ${classification.category}`);
    }

    // Create span with input and output after the operation completes
    const classifySpan = trace.span({
      name: 'classify_message',
      type: 'llm',
      input: {
        chatName: chat.name,
        sender: message.sender,
        messageId: message.id,
        textPreview: message.text.slice(0, 200),
      },
      output: {
        category: classification.category,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        urgency: classification.urgency,
      },
      metadata: {
        messageId: message.id,
        chatId: chat.id,
        model: 'gpt-4o-mini',
        tokensUsed: response.usage?.total_tokens,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
      },
    });

    classifySpan.end();

    return classification;
  } catch (error) {
    // Create span with error information
    const errorSpan = trace.span({
      name: 'classify_message',
      type: 'llm',
      input: {
        chatName: chat.name,
        sender: message.sender,
        messageId: message.id,
        textPreview: message.text.slice(0, 200),
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
