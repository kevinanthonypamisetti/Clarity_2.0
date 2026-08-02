import { buildContext } from '../contextManager.js';

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }

function run() {
  const results = [
    { id: 'a', source: 'Thought', title: 'A', snippet: 'I am building an AI startup for students', score: 0.9, confidence: 0.9, metadata: { createdAt: new Date().toISOString() } },
    { id: 'b', source: 'Thought', title: 'B', snippet: 'AI project for education', score: 0.8, confidence: 0.8, metadata: { createdAt: new Date().toISOString() } },
    { id: 'a', source: 'Thought', title: 'A duplicate', snippet: 'Duplicate text', score: 0.1, confidence: 0.1 }
  ];

  const ctx = buildContext(results, { tokenBudget: 50, maxItems: 10, snippetChars: 100 });
  console.log('context test', ctx);
  assert(ctx.memoryCount === 2 || ctx.memoryCount === 1, 'dedupe should have removed duplicates');
  assert(typeof ctx.confidence === 'number', 'confidence should be numeric');
  assert(Array.isArray(ctx.citations), 'citations array present');
  console.log('contextManager test passed');
}

if (typeof window !== 'undefined') window.runContextManagerTest = run; else run();
