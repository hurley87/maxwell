import { strict as assert } from "node:assert";

import { formatGitSummaryLine, formatPrLine } from "@/lib/github/format";

function run() {
  const prLine = formatPrLine({
    occurredAt: "2026-01-30T14:10:00.000Z",
    project: "Maxwell",
    kind: "pr_opened",
    pr: {
      repoFullName: "owner/repo",
      number: 123,
      title: 'Improve "memory" ranking',
      url: "https://github.com/owner/repo/pull/123",
      state: "OPEN",
      additions: 245,
      deletions: 120,
      changedFiles: 9,
      createdAt: "2026-01-30T14:10:00.000Z",
    },
  });

  assert.ok(prLine.includes("[[Maxwell]]"), "PR line should include project wiki-link");
  assert.ok(prLine.includes('PR #123'), "PR line should include PR number");
  assert.ok(prLine.includes("+245/-120"), "PR line should include diff stat");

  const summary = formatGitSummaryLine({
    occurredAt: "2026-01-30T23:59:59.000Z",
    project: "Maxwell",
    commits: 3,
    additions: 410,
    deletions: 210,
    touchedFiles: 22,
  });

  assert.ok(summary.includes("git: 3 commits"), "Summary should include commit count");
  assert.ok(summary.includes("+410/-210"), "Summary should include totals");

  console.log("github-sync-selftest: OK");
}

run();

