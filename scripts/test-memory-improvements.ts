import { strict as assert } from 'node:assert';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { initDb, indexNote, search, buildActivityDigest } from '../src/lib/memory';
import { todayLocalDate } from '../src/lib/utils/date';

/**
 * Test that markdown headers reset entity context
 */
function testHeaderAttributionReset() {
  console.log('Testing header attribution reset...');

  const testNote = join(process.cwd(), 'notes', 'daily', 'test-attribution.md');
  const testContent = `- [[Maxwell]]
    - Some task under Maxwell

## Email Actions
- [10:00] replied to test@example.com: "Test"

## Code Actions
- [14:00] [[Maxwell]] commit abc123 "Test commit"
`;

  try {
    writeFileSync(testNote, testContent, 'utf-8');
    indexNote(testNote);

    // Search for email action - should find it attached to date entity, not Maxwell
    const results = search('replied to test@example.com');
    
    assert.ok(results.length > 0, 'Should find email action');
    const emailObs = results[0].observations.find(o => o.content.includes('replied to test@example.com'));
    assert.ok(emailObs, 'Should find email observation');
    
    // The observation should be attached to date entity, not Maxwell
    // Check that it's not under Maxwell entity
    const maxwellResults = search('Maxwell');
    const maxwellObs = maxwellResults.find(r => r.entity.name === 'Maxwell');
    if (maxwellObs) {
      const hasEmailAction = maxwellObs.observations.some(o => o.content.includes('replied to test@example.com'));
      assert.ok(!hasEmailAction, 'Email action should NOT be under Maxwell entity');
    }

    console.log('  ✓ Header attribution reset works correctly');
  } finally {
    try {
      unlinkSync(testNote);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Test that HTML comments are stripped from observation content
 */
function testSanitization() {
  console.log('Testing content sanitization...');

  const testNote = join(process.cwd(), 'notes', 'daily', 'test-sanitize.md');
  const testContent = `## Code Actions
- [14:00] [[Maxwell]] PR #123 "Test PR" <!-- pr_opened:owner/repo#123 -->
`;

  try {
    writeFileSync(testNote, testContent, 'utf-8');
    indexNote(testNote);

    // Search for the PR - content should not include HTML comment
    const results = search('PR #123');
    
    assert.ok(results.length > 0, 'Should find PR observation');
    const prObs = results[0].observations.find(o => o.content.includes('PR #123'));
    assert.ok(prObs, 'Should find PR observation');
    
    // Content should NOT contain HTML comment
    assert.ok(!prObs.content.includes('<!--'), 'Content should not contain HTML comment');
    assert.ok(!prObs.content.includes('pr_opened:'), 'Content should not contain comment text');

    console.log('  ✓ HTML comments are stripped from content');
  } finally {
    try {
      unlinkSync(testNote);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Test that activity digest is bounded
 */
function testActivityDigestBounds() {
  console.log('Testing activity digest bounds...');

  const digest = buildActivityDigest({ days: 7, limit: 10 });
  
  // Digest should have summary string
  assert.ok(typeof digest.summary === 'string', 'Digest should have summary');
  
  // Counts should be numbers
  assert.ok(typeof digest.commsCount === 'number', 'Comms count should be number');
  assert.ok(typeof digest.codeCount === 'number', 'Code count should be number');
  assert.ok(typeof digest.totalObservations === 'number', 'Total should be number');

  // Test with very small limit
  const boundedDigest = buildActivityDigest({ days: 1, limit: 2 });
  assert.ok(boundedDigest.totalObservations <= 2 || boundedDigest.summary.includes('...'), 
    'Digest should respect limit or show truncation');

  console.log('  ✓ Activity digest respects bounds');
}

/**
 * Test local date function
 */
function testLocalDate() {
  console.log('Testing local date function...');

  const localDate = todayLocalDate();
  
  // Should be YYYY-MM-DD format
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(localDate), 'Date should be YYYY-MM-DD format');
  
  // Should be today's date in local timezone
  const now = new Date();
  const expectedYear = now.getFullYear();
  const expectedMonth = String(now.getMonth() + 1).padStart(2, '0');
  const expectedDay = String(now.getDate()).padStart(2, '0');
  const expected = `${expectedYear}-${expectedMonth}-${expectedDay}`;
  
  assert.strictEqual(localDate, expected, 'Should return today in local timezone');

  console.log('  ✓ Local date function works correctly');
}

async function runTests() {
  console.log('=== Memory Improvements Test Suite ===\n');

  // Initialize DB
  console.log('Initializing database...');
  initDb();
  console.log('  ✓ Database initialized\n');

  try {
    testHeaderAttributionReset();
    console.log();
    
    testSanitization();
    console.log();
    
    testActivityDigestBounds();
    console.log();
    
    testLocalDate();
    console.log();

    console.log('=== All tests passed ===');
  } catch (error) {
    console.error('Test failed:', error);
    process.exitCode = 1;
  }
}

runTests().catch(console.error);
