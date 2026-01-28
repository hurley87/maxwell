import OpenAI from 'openai';
import { Email, Classification } from './types';
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
 * Classifies an email into one of three categories using LLM.
 * Creates an Opik span to trace the classification decision.
 */
export async function classifyEmail(
  email: Email,
  trace: ReturnType<ReturnType<typeof getOpik>['trace']>
): Promise<Classification> {
  const openai = getOpenAI();
  const prompt = CLASSIFICATION_PROMPT
    .replace('{{from}}', email.from)
    .replace('{{subject}}', email.subject)
    .replace('{{date}}', email.date)
    .replace('{{body}}', email.body.slice(0, 3000)); // Truncate for token efficiency

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
      !['needs_response', 'informational', 'unsubscribe', 'ignorable'].includes(
        classification.category
      )
    ) {
      throw new Error(`Invalid category: ${classification.category}`);
    }

    // Create span with input and output after the operation completes
    const classifySpan = trace.span({
      name: 'classify_email',
      type: 'llm',
      input: {
        from: email.from,
        subject: email.subject,
        emailId: email.id,
        bodyPreview: email.body.slice(0, 500),
      },
      output: {
        category: classification.category,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        urgency: classification.urgency,
      },
      metadata: {
        emailId: email.id,
        threadId: email.threadId,
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
      name: 'classify_email',
      type: 'llm',
      input: {
        from: email.from,
        subject: email.subject,
        emailId: email.id,
        bodyPreview: email.body.slice(0, 500),
      },
      output: {},
      metadata: {
        emailId: email.id,
        threadId: email.threadId,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    errorSpan.end();
    throw error;
  }
}
