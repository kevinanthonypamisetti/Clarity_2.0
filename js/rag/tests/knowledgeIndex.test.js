import KnowledgeIndex from '../knowledgeIndex.js';

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }

function run() {
  const idx = new KnowledgeIndex();
  idx.add({ id: 'a', text: 'I love building AI startups', source: 'thought', metadata: { createdAt: new Date().toISOString() } });
  idx.add({ id: 'b', text: 'AI for students and education', source: 'thought', metadata: { createdAt: new Date().toISOString() } });
  const res = idx.query('AI startup', 2);
  assert(Array.isArray(res), 'Result should be array');
  assert(res.length > 0, 'Should return at least one result');
  console.log('knowledgeIndex test passed', res.map(r => ({ id: r.id, score: r.score })));
}

if (typeof window !== 'undefined') window.runKnowledgeIndexTest = run; else run();
