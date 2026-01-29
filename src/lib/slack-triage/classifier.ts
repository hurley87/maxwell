import OpenAI from 'openai';
import { SlackMessage, Classification } from './types';
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
 * Checks if a message mentions the user.
 */
function mentionsUser(text: string, userId: string): boolean {
  // Check for direct mention (@U123ABC)
  if (text.includes(`<@${userId}>`)) {
    return true;
  }
  // Check for @here or @channel (which includes the user)
  if (text.includes('<!here>') || text.includes('<!channel>')) {
    return true;
  }
  return false;
}

/**
 * Checks if message has a ✅ reaction (indicating already acknowledged).
 */
function hasCheckmarkReaction(message: SlackMessage): boolean {
  return message.reactions?.some((r) => r.name === 'white_check_mark' || r.name === 'heavy_check_mark') || false;
}

/**
 * Classifies a Slack message into one of four categories using LLM.
 * Creates an Opik span to trace the classification decision.
 */
export async function classifyMessage(
  message: SlackMessage,
  userId: string,
  trace: ReturnType<ReturnType<typeof getOpik>['trace']>
): Promise<Classification> {
  const openai = getOpenAI();
  
  const mentionsMe = mentionsUser(message.text, userId);
  const isThread = !!message.threadTs;
  const hasReactions = (message.reactions?.length || 0) > 0;
  const hasCheckmark = hasCheckmarkReaction(message);

  // Skip classification if already acknowledged
  if (hasCheckmark) {
    return {
      category: 'ignorable',
      confidence: 1.0,
      reasoning: 'Message already has checkmark reaction, indicating acknowledgment',
    };
  }

  const prompt = CLASSIFICATION_PROMPT
    .replace('{{channel}}', message.channel)
    .replace('{{user}}', message.user)
    .replace('{{text}}', message.text.slice(0, 2000)) // Truncate for token efficiency
    .replace('{{ts}}', message.ts)
    .replace('{{isThread}}', isThread ? 'yes' : 'no')
    .replace('{{replyCount}}', String(message.replyCount || 0))
    .replace('{{hasReactions}}', hasReactions ? 'yes' : 'no')
    .replace('{{mentionsMe}}', mentionsMe ? 'yes' : 'no');

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
      !['needs_response', 'informational', 'mention', 'ignorable'].includes(
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
        channel: message.channel,
        user: message.user,
        messageId: message.ts,
        textPreview: message.text.slice(0, 500),
        mentionsMe,
        isThread,
        replyCount: message.replyCount,
      },
      output: {
        category: classification.category,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        urgency: classification.urgency,
      },
      metadata: {
        messageId: message.ts,
        channelId: message.channel,
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
        channel: message.channel,
        user: message.user,
        messageId: message.ts,
        textPreview: message.text.slice(0, 500),
      },
      output: {},
      metadata: {
        messageId: message.ts,
        channelId: message.channel,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    errorSpan.end();
    throw error;
  }
}
