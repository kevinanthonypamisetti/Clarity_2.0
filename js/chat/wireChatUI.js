// Wire the floating chat input to window.ClarityAI.chat()
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.querySelector('textarea[placeholder*="Message Clarity"]');
  if (!textarea) return;

  const sendBtn = textarea.nextElementSibling?.querySelector('button:last-child');
  const chatContainer = document.getElementById('chat-container');
  const win = window;

  sendBtn?.addEventListener('click', async (e) => {
    const text = textarea.value.trim();
    if (!text) return;
    textarea.value = '';
    textarea.style.height = 'auto';

    // Append user message to UI
    if (chatContainer) {
      const wrapper = document.createElement('div');
      wrapper.className = 'flex gap-md items-start justify-end';
      wrapper.innerHTML = `
        <div class="space-y-sm text-right">
          <div class="flex items-center justify-end gap-sm">
            <span class="font-label-md text-label-md text-outline">Just now</span>
            <span class="font-label-md text-label-md font-bold text-on-surface">You</span>
          </div>
          <div class="p-lg bg-primary text-on-primary rounded-2xl rounded-tr-none shadow-md text-body-lg font-body-lg text-left">
            ${escapeHtml(text)}
          </div>
        </div>
        <div class="w-10 h-10 rounded-full bg-surface-container-highest border border-outline-variant overflow-hidden shrink-0"></div>
      `;
      chatContainer.appendChild(wrapper);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Start chat
    const clarity = win.ClarityAI || {};
    const eventBus = clarity.eventBus || (win.eventBus || null);

    // Create assistant bubble
    let assistantEl = null;
    if (chatContainer) {
      assistantEl = document.createElement('div');
      assistantEl.className = 'flex gap-md items-start max-w-[85%]';
      assistantEl.innerHTML = `
        <div class="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0 ai-glow">
          <span class="material-symbols-outlined text-on-primary-container">auto_awesome</span>
        </div>
        <div class="space-y-sm w-full">
          <div class="flex items-center gap-sm">
            <span class="font-label-md text-label-md font-bold text-primary">Clarity AI</span>
            <span class="ml-2 font-label-md text-[10px] text-outline italic" id="provider-badge">Streaming...</span>
          </div>
          <div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-2xl rounded-tl-none shadow-sm text-on-surface font-body-lg text-body-lg leading-relaxed" id="assistant-stream">
          </div>
          <div id="sources-drawer" class="mt-2 hidden bg-surface-container-lowest p-3 rounded-lg border border-outline-variant max-h-44 overflow-y-auto"></div>
        </div>
      `;
      chatContainer.appendChild(assistantEl);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Controls: stop, copy, retry
    const controls = document.createElement('div');
    controls.className = 'flex gap-2 mt-2';
    controls.innerHTML = `
      <button class="px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high">Stop</button>
      <button class="px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high">Retry</button>
      <button class="px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high">Copy</button>
      <button class="px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high">Sources</button>
      <span class="ml-auto font-label-md text-label-md text-on-surface-variant" id="status-line">Thinking...</span>
    `;
    assistantEl.querySelector('.space-y-sm')?.appendChild(controls);

    const stopBtn = controls.querySelector('button:nth-child(1)');
    const retryBtn = controls.querySelector('button:nth-child(2)');
    const copyBtn = controls.querySelector('button:nth-child(3)');
    const statusLine = controls.querySelector('#status-line');

    // Listen for provider stream events if eventBus exists
    // keep a raw buffer for final markdown render
    if (assistantEl) assistantEl.__raw = '';
    const streamHandler = (ev) => {
      const data = ev?.chunk ?? ev?.detail?.chunk ?? ev;
      if (assistantEl) {
        assistantEl.__raw = (assistantEl.__raw || '') + String(data);
        const out = assistantEl.querySelector('#assistant-stream');
        out.textContent = (out.textContent || '') + String(data);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    };
    // store last context for Sources drawer
    let lastContext = null;
    const contextHandler = (ev) => { lastContext = ev?.detail?.context || ev?.context || null; };

    const finishedHandler = (ev) => {
      // render markdown on finish
      try {
        if (assistantEl && assistantEl.__raw) {
          const out = assistantEl.querySelector('#assistant-stream');
          out.innerHTML = renderMarkdown(assistantEl.__raw || '');
          // load highlight.js if not present
          if (!window.hljs) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/default.min.css';
            document.head.appendChild(link);
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js';
            script.onload = () => { document.querySelectorAll('pre code').forEach(el=>window.hljs.highlightElement(el)); };
            document.head.appendChild(script);
          } else {
            document.querySelectorAll('pre code').forEach(el=>window.hljs.highlightElement(el));
          }
        }
      } catch (e) {
        try { (eventBus || (window.ClarityAI && window.ClarityAI.eventBus))?.emit('clarity:error', { module: 'wireChatUI.render', error: e?.message, stack: e?.stack }); } catch (er) { console.warn('render finish failed', e); }
      }
    };
    const statusHandler = (ev) => {
      const d = ev?.detail || ev;
      if (d?.type === 'search-start') statusLine.textContent = 'Searching memory...';
      if (d?.type === 'search-finished') statusLine.textContent = `Found ${Array.isArray(d.results)?d.results.length:0} memories`;
      if (d?.type === 'context-ready') statusLine.textContent = 'Building context...';
      if (d?.type === 'provider-start') statusLine.textContent = 'Generating...';
      if (d?.type === 'provider-finished') statusLine.textContent = 'Done';
    };

    if (eventBus?.on) {
      eventBus.on('clarity:provider-stream', streamHandler);
      eventBus.on('clarity:search-start', (e)=>statusHandler({detail:{type:'search-start'}}));
      eventBus.on('clarity:search-finished', (e)=>statusHandler({detail:{type:'search-finished', results: e.detail.results}}));
      eventBus.on('clarity:context-ready', (e)=>{ statusHandler({detail:{type:'context-ready'}}); contextHandler(e); });
      eventBus.on('clarity:provider-start', (e)=>statusHandler({detail:{type:'provider-start'}}));
      eventBus.on('clarity:provider-finished', (e)=>{ statusHandler({detail:{type:'provider-finished'}}); finishedHandler(e); });
      eventBus.on('clarity:provider-stream', streamHandler);
    } else if (eventBus && eventBus.addEventListener) {
      eventBus.addEventListener('clarity:provider-stream', streamHandler);
      eventBus.addEventListener('clarity:context-ready', contextHandler);
      eventBus.addEventListener('clarity:provider-finished', finishedHandler);
      // best-effort for other events
    }

    // Wire control actions
    stopBtn.addEventListener('click', () => {
      if (window.ClarityAI) window.ClarityAI.abortRequested = true;
      statusLine.textContent = 'Stopped';
    });
    copyBtn.addEventListener('click', () => {
      const out = assistantEl.querySelector('#assistant-stream');
      if (out) navigator.clipboard.writeText(out.textContent || '');
    });
    retryBtn.addEventListener('click', async () => {
      // clear assistant content and re-run
      const out = assistantEl.querySelector('#assistant-stream');
      if (out) out.textContent = '';
      statusLine.textContent = 'Retrying...';
      try {
        await clarity.chat({conversationId: 'default', message: text});
      } catch (err) {
        try { (eventBus || (window.ClarityAI && window.ClarityAI.eventBus))?.emit('clarity:error', { module: 'wireChatUI.retry', error: err?.message, stack: err?.stack }); } catch (e) { console.error('Retry failed', err); }
        if (out) out.textContent = 'Error: ' + err.message;
      }
    });

    // Sources toggle
    const sourcesBtn = controls.querySelector('button:nth-child(4)');
    const sourcesDrawer = assistantEl.querySelector('#sources-drawer');
    sourcesBtn.addEventListener('click', () => {
      if (!sourcesDrawer) return;
      if (sourcesDrawer.classList.contains('hidden')) {
        // populate
        sourcesDrawer.innerHTML = '';
        const items = (lastContext && lastContext.items) || [];
        if (!items.length) sourcesDrawer.innerHTML = '<div class="text-on-surface-variant">No sources</div>';
        items.forEach(it => {
          const el = document.createElement('div');
          el.className = 'p-2 border-b border-outline-variant/30 last:border-b-0';
          el.innerHTML = `<div class="font-semibold text-body-md">${escapeHtml(it.title || it.source || it.id || (it.text||'').slice(0,40))}</div><div class="text-[12px] text-on-surface-variant">${escapeHtml((it.text||it.content||'').slice(0,160))}</div>`;
          sourcesDrawer.appendChild(el);
        });
        sourcesDrawer.classList.remove('hidden');
      } else {
        sourcesDrawer.classList.add('hidden');
      }
    });

    // provider badge: show active provider name if available
    const badgeEl = assistantEl.querySelector('#provider-badge');
    try {
      const pm = window.ClarityAI && window.ClarityAI.providerManager;
      if (pm && badgeEl) {
        const names = pm.listProviders();
        const active = pm.getActive();
        let activeName = names.find(n => pm.get(n) === active) || names[0] || 'local';
        badgeEl.textContent = `${activeName.toUpperCase()}`;
      }
    } catch (e) {}

    try {
      const res = await clarity.chat({conversationId: 'default', message: text});
      if (!eventBus) {
        // fill assistant with final text
        if (assistantEl) {
          const out = assistantEl.querySelector('#assistant-stream');
          out.textContent = res?.text || '';
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }
    } catch (err) {
      try { (eventBus || (window.ClarityAI && window.ClarityAI.eventBus))?.emit('clarity:error', { module: 'wireChatUI.chat', error: err?.message, stack: err?.stack }); } catch (e) { console.error('Chat error', err); }
      if (assistantEl) {
        const out = assistantEl.querySelector('#assistant-stream');
        out.textContent = 'Error: ' + err.message;
      }
    } finally {
      if (eventBus?.off) {
        eventBus.off('clarity:provider-stream', streamHandler);
        eventBus.off('clarity:context-ready', contextHandler);
        eventBus.off('clarity:provider-finished', finishedHandler);
      }
      if (eventBus?.removeEventListener) {
        eventBus.removeEventListener('clarity:provider-stream', streamHandler);
        eventBus.removeEventListener('clarity:context-ready', contextHandler);
        eventBus.removeEventListener('clarity:provider-finished', finishedHandler);
      }
    }
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (s) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]);
    });
  }

  function renderMarkdown(md) {
    if (!md) return '';
    // Preserve code fences
    const codeRe = /```(\w+)?\n([\s\S]*?)```/g;
    let html = md.replace(codeRe, (m, lang, code) => {
      const l = lang || '';
      return `<pre><code class="language-${escapeHtml(l)}">${escapeHtml(code)}</code></pre>`;
    });
    // simple lists
    html = html.replace(/^\s*[-\*]\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (m) => '<ul>' + m + '</ul>');
    // paragraphs
    html = html.split('\n\n').map(p => `<p>${escapeHtml(p).replace(/\n/g,'<br/>')}</p>`).join('');
    return html;
  }
});
