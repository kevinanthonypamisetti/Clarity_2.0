import tokenize from '../rag/tokenizer.js';

function estimateTokens(text) { return tokenize(text).length; }

function truncateHistory(history, maxTokens) {
  // history: [{role:'user'|'assistant', content:''}, ...] newest last
  const out = [];
  let tokens = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    const t = Math.max(1, estimateTokens(item.content || ''));
    if (tokens + t > maxTokens) break;
    out.unshift(item);
    tokens += t;
  }
  return out;
}

export function buildPrompt({ systemPrompt = 'You are Clarity AI, an empathetic assistant.', context = null, conversation = [], userQuestion = '', options = {} } = {}) {
  const { maxTokens = 1500, maxHistoryTokens = 800 } = options;
  const ctx = context || { memories: [], citations: [] };

  // assemble Retrieved Context section
  const ctxLines = [];
  for (let i = 0; i < (ctx.memories || []).length; i++) {
    const m = ctx.memories[i];
    ctxLines.push(`[Memory ${i + 1}] (${m.source}) ${m.title}\n${m.snippet}`);
  }
  const retrievedContext = ctxLines.join('\n\n');

  // trim conversation history to token budget
  const remaining = Math.max(0, maxTokens - estimateTokens(retrievedContext) - Math.max(0, estimateTokens(userQuestion)) - 50);
  const allowedHistory = Math.min(maxHistoryTokens, remaining);
  const shortHistory = truncateHistory(conversation, allowedHistory);

  const historyText = (shortHistory || []).map(m => (m.role === 'user' ? 'User: ' : 'Assistant: ') + m.content).join('\n');

  const sections = [];
  sections.push('SYSTEM:\n' + systemPrompt);
  sections.push('\n-- Retrieved Context --\n' + (retrievedContext || 'No relevant memories found.'));
  sections.push('\n-- Conversation History --\n' + (historyText || 'No prior messages.'));
  sections.push('\n-- User Question --\n' + userQuestion);

  const prompt = sections.join('\n\n');
  return { prompt, context: ctx, truncatedHistory: shortHistory, citations: ctx.citations || [], tokenEstimate: estimateTokens(prompt) };
}

export default { buildPrompt };
