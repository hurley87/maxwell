import { initDb, indexAll, search, buildContext, getPendingTasks, getStats } from '../src/lib/memory';

async function testMemory() {
  console.log('=== Maxwell Memory Test ===\n');

  console.log('1. Initializing database...');
  initDb();
  console.log('   Done.\n');

  console.log('2. Indexing all notes...');
  indexAll();
  const stats = getStats();
  console.log(`   Indexed: ${stats.entities} entities, ${stats.observations} observations, ${stats.relations} relations\n`);

  console.log('3. Testing search...');
  const searchResults = search('Jackson');
  console.log(`   Found ${searchResults.length} results for "Jackson"`);
  if (searchResults.length > 0) {
    console.log(`   First result: ${searchResults[0].observations[0]?.content}\n`);
  }

  console.log('3b. Testing recency-weighted search...');
  const testQuery = 'Jackson';
  const withoutRecency = search(testQuery, 5);
  const withRecency = search(testQuery, 5, { recency: true, halfLifeDays: 30 });
  
  console.log(`   Query: "${testQuery}"`);
  console.log(`   Without recency (top 3):`);
  withoutRecency.slice(0, 3).forEach((r, i) => {
    const firstObs = r.observations[0];
    console.log(`     ${i + 1}. ${r.entity.name} (score: ${r.score.toFixed(2)}, date: ${firstObs?.createdAt || 'N/A'})`);
  });
  
  console.log(`   With recency weighting (top 3):`);
  withRecency.slice(0, 3).forEach((r, i) => {
    const firstObs = r.observations[0];
    console.log(`     ${i + 1}. ${r.entity.name} (score: ${r.score.toFixed(2)}, date: ${firstObs?.createdAt || 'N/A'})`);
  });
  console.log();

  console.log('4. Testing context builder...');
  const context = buildContext({ entity: 'lazer', recentDays: 7, includePendingTasks: true });
  console.log('   Context for "lazer":');
  console.log(context.formattedContext);
  console.log();

  console.log('5. Testing pending tasks...');
  const tasks = getPendingTasks();
  console.log(`   Found ${tasks.length} pending tasks:`);
  tasks.slice(0, 5).forEach(t => console.log(`   - ${t.content}`));

  console.log('\n=== All tests passed ===');
}

testMemory().catch(console.error);
