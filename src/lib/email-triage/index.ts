import { execSync } from 'child_process';
import { Email, ProcessedEmail, TriageResult, FetchOptions } from './types';
import { classifyEmail } from './classifier';
import { generateSummary, generateReplyDraft } from './processor';
import { opik } from './opik-client';

/**
 * Fetches a single email's full content using the gog CLI.
 */
function fetchEmailContent(
  messageId: string,
  accountFlag: string
): Email | null {
  try {
    const cmd = `gog gmail get ${messageId} ${accountFlag} --json`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    const data = JSON.parse(output);

    return {
      id: data.message?.id || messageId,
      threadId: data.message?.threadId || messageId,
      from: data.headers?.from || '',
      to: data.headers?.to || '',
      subject: data.headers?.subject || '',
      body: data.body || '',
      date: data.headers?.date || '',
      snippet: data.body?.slice(0, 200) || '',
    };
  } catch (error) {
    console.error(`Failed to fetch email ${messageId}:`, error);
    return null;
  }
}

/**
 * Fetches unread emails using the gog CLI.
 * First searches for message IDs, then fetches full content for each.
 */
export async function fetchUnreadEmails(
  options: FetchOptions = {}
): Promise<Email[]> {
  const { hoursBack = 24, maxEmails = 50, account } = options;

  const query = `in:inbox is:unread newer_than:${hoursBack}h`;
  const accountFlag = account ? `--account ${account}` : '';

  // Step 1: Search for message IDs
  const searchCmd = `gog gmail messages search "${query}" --max ${maxEmails} ${accountFlag} --json`;

  try {
    const output = execSync(searchCmd, { encoding: 'utf-8' });
    const parsed = JSON.parse(output);

    // gog returns { messages: [...] } object
    const messages = parsed.messages || [];
    if (!Array.isArray(messages) || messages.length === 0) {
      return [];
    }

    // Step 2: Fetch full content for each message
    const emails: Email[] = [];
    for (const msg of messages) {
      const email = fetchEmailContent(msg.id as string, accountFlag);
      if (email) {
        emails.push(email);
      }
    }

    return emails;
  } catch (error) {
    throw new Error(
      `Failed to fetch emails: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Processes a single email: classifies it and generates summary/reply as needed.
 */
async function processEmail(
  email: Email,
  trace: ReturnType<typeof opik.trace>
): Promise<ProcessedEmail> {
  // Step 1: Classify
  const classification = await classifyEmail(email, trace);

  const result: ProcessedEmail = {
    email,
    classification,
  };

  // Step 2: Category-specific processing
  if (classification.category === 'needs_response') {
    const reply = await generateReplyDraft(email, classification, trace);
    result.suggestedReply = reply;
  } else if (classification.category === 'informational') {
    const summary = await generateSummary(email, trace);
    result.summary = summary;
  }

  return result;
}

/**
 * Main email triage pipeline.
 * Fetches unread emails, classifies them, and generates summaries/replies.
 * All operations are traced with Opik for observability.
 */
export async function runEmailTriage(
  options: FetchOptions = {}
): Promise<TriageResult> {
  // Create main trace for this triage run
  const trace = opik.trace({
    name: 'email_triage',
    input: {
      hoursBack: options.hoursBack || 24,
      maxEmails: options.maxEmails || 50,
      account: options.account,
    },
    metadata: {
      triggeredAt: new Date().toISOString(),
    },
  });

  try {
    // Fetch emails
    const emails = await fetchUnreadEmails(options);

    const results: TriageResult = {
      processedAt: new Date().toISOString(),
      stats: {
        total: emails.length,
        needsResponse: 0,
        informational: 0,
        unsubscribe: 0,
        ignorable: 0,
      },
      needsResponse: [],
      informational: [],
      unsubscribe: [],
      ignorable: [],
    };

    // Process emails sequentially (could parallelize with Promise.all for speed)
    for (const email of emails) {
      try {
        const processed = await processEmail(email, trace);

        switch (processed.classification.category) {
          case 'needs_response':
            results.needsResponse.push(processed);
            results.stats.needsResponse++;
            break;
          case 'informational':
            results.informational.push(processed);
            results.stats.informational++;
            break;
          case 'unsubscribe':
            results.unsubscribe.push(processed);
            results.stats.unsubscribe++;
            break;
          case 'ignorable':
            results.ignorable.push(processed);
            results.stats.ignorable++;
            break;
        }
      } catch (error) {
        // Log error but continue processing other emails
        console.error(
          `Error processing email ${email.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // End trace - stats are included in the results object returned
    trace.end();

    // Flush traces to Opik
    await opik.flush();

    return results;
  } catch (error) {
    // End trace - error info is in metadata
    trace.end();
    await opik.flush();
    throw error;
  }
}

/**
 * CLI entry point.
 * Parses command-line arguments and runs the triage pipeline.
 */
async function main() {
  const args = process.argv.slice(2);

  const options: FetchOptions = {};

  // Parse --hours=N
  const hoursMatch = args.find((a) => a.startsWith('--hours='));
  if (hoursMatch) {
    const hours = parseInt(hoursMatch.split('=')[1], 10);
    if (!isNaN(hours) && hours > 0) {
      options.hoursBack = hours;
    }
  }

  // Parse --max=N
  const maxMatch = args.find((a) => a.startsWith('--max='));
  if (maxMatch) {
    const max = parseInt(maxMatch.split('=')[1], 10);
    if (!isNaN(max) && max > 0) {
      options.maxEmails = max;
    }
  }

  // Parse --account=email@example.com
  const accountMatch = args.find((a) => a.startsWith('--account='));
  if (accountMatch) {
    options.account = accountMatch.split('=')[1];
  }

  try {
    const result = await runEmailTriage(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Email triage failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
