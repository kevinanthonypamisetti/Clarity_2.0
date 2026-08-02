// Lightweight chat orchestrator for Clarity
// Orchestrates: search -> buildContext -> buildPrompt -> provider -> persist -> stream

export async function chat({conversationId, message, provider = 'local', topK = 5} = {}) {
  const win = typeof window !== 'undefined' ? window : globalThis;
  const clarity = win.ClarityAI || {};
  const eventBus = clarity.eventBus || (win.eventBus || null);

  try {
    eventBus?.emit?.('clarity:chat-start', {conversationId, message, provider});

    // 1) Search/retrieve
    eventBus?.emit?.('clarity:search-start', {q: message, topK});
    let searchResults = [];
    if (typeof clarity.search === 'function') {
      searchResults = await clarity.search(message, {topK});
    } else if (clarity.knowledgeIndex?.search) {
      searchResults = await clarity.knowledgeIndex.search(message, topK);
    }
    eventBus?.emit?.('clarity:search-finished', {results: searchResults});

    // 2) Build context
    eventBus?.emit?.('clarity:context-build-start', {conversationId, message});
    let context = null;
    if (clarity.contextManager?.buildContext) {
      context = await clarity.contextManager.buildContext({query: message, results: searchResults, conversationId, topK});
    } else {
      // Basic fallback: package topK results into a context object
      context = {items: Array.isArray(searchResults) ? searchResults.slice(0, topK) : []};
    }
    eventBus?.emit?.('clarity:context-ready', {context});

    // 3) Build prompt
    let prompt = message;
    if (clarity.promptBuilder?.buildPrompt) {
      prompt = await clarity.promptBuilder.buildPrompt({query: message, context});
    }

    // 4) Select provider (use ProviderManager if available)
    eventBus?.emit?.('clarity:provider-start', {provider});
    let providerImpl = null;
    const pm = clarity.providerManager || (win.ClarityAI && win.ClarityAI.providerManager) || null;
    if (pm) {
      try {
        providerImpl = provider ? pm.get(provider) : pm.getActive();
      } catch (e) {
        providerImpl = null;
      }
    }
    // fallback behavior
    if (!providerImpl) {
      if (provider === 'local') {
        try {
          const mod = await import('./localProvider.js');
          providerImpl = mod;
        } catch (e) {
          providerImpl = clarity.providers?.local;
        }
      } else {
        providerImpl = clarity.providers?.[provider];
      }
    }

    if (!providerImpl) {
      throw new Error('No provider available: ' + provider);
    }

    // 5) Stream response back to UI
    const chunks = [];
    if (typeof providerImpl.stream === 'function') {
      await providerImpl.stream({prompt, context, onChunk: (chunk) => {
        chunks.push(chunk);
        eventBus?.emit?.('clarity:provider-stream', {chunk});
      }});
    } else if (typeof providerImpl.generate === 'function') {
      const res = await providerImpl.generate({prompt, context});
      chunks.push(res.text || String(res));
      eventBus?.emit?.('clarity:provider-stream', {chunk: res});
    } else {
      throw new Error('Provider has no stream/generate API');
    }

    eventBus?.emit?.('clarity:provider-finished', {response: chunks.join('')});

    // 6) Persist conversation
    try {
      const convRepo = clarity.conversationRepository || clarity.repository?.conversationRepository;
      if (convRepo?.appendMessage) {
        // append user message and assistant message
        await convRepo.appendMessage(conversationId, {role: 'user', content: message, timestamp: Date.now()});
        await convRepo.appendMessage(conversationId, {role: 'assistant', content: chunks.join(''), timestamp: Date.now(), meta: {provider, contextIds: (context.items||[]).map(i=>i.id), citations: (context.items||[]).map(i=>i.source||i.id)}});
      } else if (clarity.saveConversation) {
        await clarity.saveConversation({conversationId, message, response: chunks.join(''), context});
      }
      eventBus?.emit?.('clarity:conversation-saved', {conversationId});
    } catch (err) {
      // non-fatal persistence error — emit error event
      try { eventBus?.emit?.('clarity:error', { module: 'chatEngine.persistence', error: err?.message, stack: err?.stack }); } catch (e) { /* ignore */ }
    }

    eventBus?.emit?.('clarity:chat-finished', {conversationId, response: chunks.join('')});
    return {text: chunks.join(''), context};
  } catch (err) {
    eventBus?.emit?.('clarity:chat-error', {error: err});
    throw err;
  }
}

// Register to global API surface if present
if (typeof window !== 'undefined') {
  window.ClarityAI = window.ClarityAI || {};
  window.ClarityAI.chat = window.ClarityAI.chat || chat;
}
