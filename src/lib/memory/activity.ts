import { getDb } from './db';

export type ActivityDigestOptions = {
  days?: number;
  limit?: number;
  includeComms?: boolean;
  includeCode?: boolean;
};

export type ActivityDigest = {
  summary: string;
  commsCount: number;
  codeCount: number;
  totalObservations: number;
};

/**
 * Build a bounded "recent activity" digest summarizing comms + code actions
 * from the last N days for agent prompt injection.
 */
export function buildActivityDigest(options: ActivityDigestOptions = {}): ActivityDigest {
  const db = getDb();
  const days = options.days ?? 7;
  const limit = options.limit ?? 50;
  const includeComms = options.includeComms !== false; // default true
  const includeCode = options.includeCode !== false; // default true

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = cutoffDate.toISOString().split('T')[0];

  const lines: string[] = [];
  let commsCount = 0;
  let codeCount = 0;

  // Get code activity from integration_events (structured, reliable)
  const byDate = new Map<string, {
    comms: Array<{ content: string; createdAt: string }>;
    code: Array<{ content: string; createdAt: string }>;
  }>();

  if (includeCode) {
    const integrationEvents = db.prepare(`
      SELECT * FROM integration_events
      WHERE date >= ?
      ORDER BY occurred_at DESC
      LIMIT ?
    `).all(cutoff, limit) as Array<{
      id: string;
      date: string;
      occurred_at: string;
      project: string;
      repo: string;
      kind: string;
      line: string;
      payload_json: string | null;
    }>;

    for (const event of integrationEvents) {
      const date = event.date;
      if (!byDate.has(date)) {
        byDate.set(date, { comms: [], code: [] });
      }

      const dateData = byDate.get(date)!;
      
      // Strip HTML comments from line content
      const content = event.line.replace(/<!--.*?-->/g, '').trim();
      
      dateData.code.push({
        content,
        createdAt: event.occurred_at,
      });
      codeCount++;
    }
  }

  // Get comms activity from observations (look for patterns that indicate comms actions)
  if (includeComms) {
    const observations = db.prepare(`
      SELECT o.* FROM observations o
      JOIN entities e ON o.entity_id = e.id
      WHERE e.kind = 'date' 
        AND o.created_at >= ?
        AND (
          o.content LIKE '%replied to%' OR
          o.content LIKE '%unsubscribed from%' OR
          o.content LIKE '%created draft%' OR
          o.content LIKE '%reacted in%' OR
          o.content LIKE '%acknowledged%'
        )
      ORDER BY o.created_at DESC, o.source_line ASC
      LIMIT ?
    `).all(cutoff, limit) as Array<{
      id: string;
      entity_id: string;
      category: string;
      content: string;
      source_file: string;
      source_line: number;
      created_at: string;
      completed: number | null;
    }>;

    for (const obs of observations) {
      const date = obs.created_at.split('T')[0];
      if (!byDate.has(date)) {
        byDate.set(date, { comms: [], code: [] });
      }

      const dateData = byDate.get(date)!;
      
      dateData.comms.push({
        content: obs.content,
        createdAt: obs.created_at,
      });
      commsCount++;
    }
  }

  // Format summary
  const sortedDates = Array.from(byDate.keys()).sort().reverse().slice(0, days);

  if (sortedDates.length === 0) {
    return {
      summary: 'No recent activity found.',
      commsCount: 0,
      codeCount: 0,
      totalObservations: 0,
    };
  }

  for (const date of sortedDates) {
    const { comms, code } = byDate.get(date)!;
    
    if (comms.length > 0 || code.length > 0) {
      lines.push(`## ${date}`);

      if (comms.length > 0 && includeComms) {
        lines.push(`\n**Comms (${comms.length}):**`);
        for (const item of comms.slice(0, 10)) {
          lines.push(`- ${item.content}`);
        }
        if (comms.length > 10) {
          lines.push(`- ... and ${comms.length - 10} more`);
        }
      }

      if (code.length > 0 && includeCode) {
        lines.push(`\n**Code (${code.length}):**`);
        for (const item of code.slice(0, 10)) {
          lines.push(`- ${item.content}`);
        }
        if (code.length > 10) {
          lines.push(`- ... and ${code.length - 10} more`);
        }
      }

      lines.push('');
    }
  }

  return {
    summary: lines.join('\n'),
    commsCount,
    codeCount,
    totalObservations: commsCount + codeCount,
  };
}
