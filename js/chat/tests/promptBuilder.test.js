import { buildPrompt } from '../promptBuilder.js';

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }

function run() {
  const context = { memories: [{ id: 'm1', source: 'Thought', title: 'T1', snippet: 'Snippet one' }], citations: [] };
  const conv = [ { role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi' } ];
  const res = buildPrompt({ systemPrompt: 'Sys', context, conversation: conv, userQuestion: 'What did I plan?' , options: { maxTokens: 200 } });
  console.log('prompt test', res);
  assert(res.prompt.includes('SYSTEM:'), 'has system');
  assert(res.prompt.includes('-- Retrieved Context --'), 'has context');
  assert(res.prompt.includes('-- User Question --'), 'has user question');
  console.log('promptBuilder test passed');
}

if (typeof window !== 'undefined') window.runPromptBuilderTest = run; else run();
