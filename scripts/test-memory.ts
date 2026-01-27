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
