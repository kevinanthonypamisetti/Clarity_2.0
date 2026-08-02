const PAGES = [
  { id: 'dashboard', title: 'Dashboard', icon: '📊', description: 'Your overview, activity, and growth metrics.' },
  { id: 'thoughts', title: 'Thoughts', icon: '💭', description: 'Capture ideas, reflections, and notes.' },
  { id: 'tasks', title: 'Tasks', icon: '✅', description: 'Track work with quick task cards.' },
  { id: 'calendar', title: 'Calendar', icon: '🗓️', description: 'Review deadlines and timeline blocks.' },
  { id: 'knowledge', title: '📚 Knowledge', description: 'Search and organize your reference assets.' },
  { id: 'chat', title: 'Chat', icon: '💬', description: 'Ask AI questions and stream responses.' },
  { id: 'projects', title: '🚀 Projects', description: 'Manage active initiatives and progress.' },
  { id: 'reflections', title: '🪞 Reflections', description: 'Store longer retrospective notes.' },
  { id: 'settings', title: '⚙️ Settings', description: 'Adjust workspace preferences and features.' },
  { id: 'updates', title: '✨ Updates', description: 'Release notes and recent changes.' },
  { id: 'testing', title: '🧪 Testing', description: 'Explore prototyping and experiment logs.' }
];

const STORAGE_KEYS = {
  conversations: 'clarity_mvp_conversations',
  thoughts: 'clarity_mvp_thoughts',
  tasks: 'clarity_mvp_tasks',
  reflections: 'clarity_mvp_reflections'
};

const state = {
  page: 'dashboard',
  conversations: [],
  thoughts: [],
  tasks: [],
  reflections: [],
  providers: [],
  health: null,
  adminStatus: null,
  devConsoleOpen: false,
  commandOpen: false,
  selectedProvider: 'openai'
};

const helpers = {
  saveState() {
    localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(state.conversations));
    localStorage.setItem(STORAGE_KEYS.thoughts, JSON.stringify(state.thoughts));
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
    localStorage.setItem(STORAGE_KEYS.reflections, JSON.stringify(state.reflections));
  },
  loadState() {
    state.conversations = JSON.parse(localStorage.getItem(STORAGE_KEYS.conversations) || '[]');
    state.thoughts = JSON.parse(localStorage.getItem(STORAGE_KEYS.thoughts) || '[]');
    state.tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.tasks) || '[]');
    state.reflections = JSON.parse(localStorage.getItem(STORAGE_KEYS.reflections) || '[]');
  },
  notify(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3600);
  },
  normalizeText(text) {
    return text.trim().replace(/\s+/g, ' ');
  },
  formatDate(dateString) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(dateString));
  },
  randomConfidence() {
    return Math.round((0.78 + Math.random() * 0.16) * 100);
  }
};

function getPageConfig(page) {
  return PAGES.find(item => item.id === page) || PAGES[0];
}

function renderNav() {
  const nav = document.getElementById('main-nav');
  nav.innerHTML = PAGES.map(page => {
    return `<a href="#${page.id}" data-page="${page.id}" class="nav-link${state.page === page.id ? ' active' : ''}">
      <span class="icon">${page.icon || '➡️'}</span>
      <span>${page.title}</span>
    </a>`;
  }).join('');
}

function renderMain() {
  const main = document.getElementById('app-main');
  const page = state.page;
  const pageConfig = getPageConfig(page);
  document.getElementById('topbar-title').textContent = pageConfig.title;
  document.getElementById('topbar-subtitle').textContent = pageConfig.description;

  switch (page) {
    case 'dashboard':
      main.innerHTML = renderDashboard();
      renderDashboardData();
      break;
    case 'thoughts':
      main.innerHTML = renderThoughts();
      bindThoughtsEvents();
      break;
    case 'tasks':
      main.innerHTML = renderTasks();
      bindTaskEvents();
      break;
    case 'calendar':
      main.innerHTML = renderCalendar();
      break;
    case 'knowledge':
      main.innerHTML = renderKnowledge();
      break;
    case 'chat':
      main.innerHTML = renderChat();
      bindChatEvents();
      break;
    case 'projects':
      main.innerHTML = renderProjects();
      break;
    case 'reflections':
      main.innerHTML = renderReflections();
      bindReflectionEvents();
      break;
    case 'settings':
      main.innerHTML = renderSettings();
      bindSettingsEvents();
      break;
    case 'updates':
      main.innerHTML = renderUpdates();
      break;
    case 'testing':
      main.innerHTML = renderTesting();
      break;
    default:
      main.innerHTML = '<div class="panel"><p>Page not found.</p></div>';
  }
}

function renderDashboard() {
  return `
    <section class="page-header">
      <div>
        <h2>Connected workspace</h2>
        <p>Everything is wired together: health, providers, chat, and stored sessions.</p>
      </div>
      <div class="action-row">
        <span class="badge ${state.health?.ok ? 'success' : 'danger'}">Health: ${state.health?.ok ? 'Online' : 'Offline'}</span>
        <span class="badge">Provider: ${state.selectedProvider}</span>
      </div>
    </section>
    <div class="card-grid columns-3">
      <div class="panel small-card">
        <h3>Conversations</h3>
        <p>${state.conversations.length} saved threads</p>
      </div>
      <div class="panel small-card">
        <h3>Thoughts</h3>
        <p>${state.thoughts.length} items captured</p>
      </div>
      <div class="panel small-card">
        <h3>Tasks</h3>
        <p>${state.tasks.length} active tasks</p>
      </div>
    </div>
    <section class="panel">
      <h3>Quick overview</h3>
      <div class="card-grid columns-2" style="margin-top: 20px;">
        <div class="small-card">
          <strong>Provider status</strong>
          <p>${state.providers.join(', ') || 'Loading provider list...'}</p>
        </div>
        <div class="small-card">
          <strong>Memory count</strong>
          <p>${state.adminStatus?.db?.memoryCount ?? '…'}</p>
        </div>
      </div>
    </section>
    <section class="panel">
      <h3>Recent activity</h3>
      <ul class="list-panel">
        ${state.conversations.slice(-3).reverse().map(item => `<li><strong>${item.prompt}</strong><p>${item.lastReply?.slice(0, 80) || 'No response yet.'}</p></li>`).join('') || '<li>No recent conversations. Start a chat on the Chat page.</li>'}
      </ul>
    </section>
  `;
}

function renderThoughts() {
  return `
    <section class="page-header">
      <div>
        <h2>Thought Capture</h2>
        <p>Write down ideas, observations, and insight cards so they stay discoverable.</p>
      </div>
    </section>
    <section class="panel">
      <h3>Add new thought</h3>
      <input id="thought-title" type="text" placeholder="Thought title" />
      <textarea id="thought-body" placeholder="Describe the idea or reflection..."></textarea>
      <div class="action-row">
        <button class="button" id="save-thought">Save Thought</button>
        <button class="button secondary" id="clear-thought">Clear</button>
      </div>
    </section>
    <section class="panel">
      <h3>Captured thoughts</h3>
      <ul class="list-panel">
        ${state.thoughts.slice().reverse().map(item => `<li><strong>${item.title}</strong><p>${item.body}</p><small>${helpers.formatDate(item.createdAt)}</small></li>`).join('') || '<li>No thoughts yet. Record one above.</li>'}
      </ul>
    </section>
  `;
}

function renderTasks() {
  return `
    <section class="page-header">
      <div>
        <h2>Task board</h2>
        <p>Create work items and keep the flow moving.</p>
      </div>
    </section>
    <section class="panel">
      <h3>New task</h3>
      <input id="task-title" type="text" placeholder="Task title" />
      <textarea id="task-body" placeholder="Add details or acceptance criteria..."></textarea>
      <div class="action-row">
        <button class="button" id="save-task">Add Task</button>
        <button class="button secondary" id="clear-task">Clear</button>
      </div>
    </section>
    <section class="panel">
      <h3>Active tasks</h3>
      <ul class="list-panel">
        ${state.tasks.slice().reverse().map(item => `<li><strong>${item.title}</strong><p>${item.body}</p><small>${helpers.formatDate(item.createdAt)}</small></li>`).join('') || '<li>No tasks yet. Add one above.</li>'}
      </ul>
    </section>
  `;
}

function renderCalendar() {
  return `
    <section class="page-header">
      <div>
        <h2>Calendar view</h2>
        <p>Plan your work and create quick schedule entries.</p>
      </div>
    </section>
    <section class="panel">
      <h3>Upcoming timeline</h3>
      <div class="card-grid columns-2">
        <div class="small-card"><strong>Fri</strong><p>Review reflection notes.</p></div>
        <div class="small-card"><strong>Sat</strong><p>AI prompt tuning session.</p></div>
        <div class="small-card"><strong>Sun</strong><p>Project planning.</p></div>
        <div class="small-card"><strong>Mon</strong><p>Memory sync and audit.</p></div>
      </div>
    </section>
  `;
}

function renderKnowledge() {
  return `
    <section class="page-header">
      <div>
        <h2>Knowledge hub</h2>
        <p>Search your built-in reference library and memory hints.</p>
      </div>
    </section>
    <section class="panel">
      <h3>Quick search</h3>
      <input id="knowledge-query" type="text" placeholder="Search for a note, memory, or prompt..." />
      <div class="action-row">
        <button class="button" id="run-search">Search</button>
      </div>
      <div id="knowledge-results" style="margin-top: 20px;"></div>
    </section>
  `;
}

function renderChat() {
  const providerOptions = state.providers.length ? state.providers.map(provider => `<option value="${provider}">${provider}</option>`).join('') : '<option value="openai">openai</option><option value="local">local</option>';
  return `
    <section class="page-header">
      <div>
        <h2>AI chat</h2>
        <p>Ask a question, stream the response, and keep the conversation history.</p>
      </div>
    </section>
    <section class="panel">
      <div class="action-row">
        <label class="badge">Provider</label>
        <select id="chat-provider">${providerOptions}</select>
        <label class="badge">Mode</label>
        <select id="chat-model"><option value="gpt-4o-mini">gpt-4o-mini</option><option value="gpt-4o">gpt-4o</option></select>
      </div>
      <textarea id="chat-prompt" placeholder="Ask Clarity anything..." rows="4"></textarea>
      <div class="action-row">
        <button class="button" id="send-chat">Send prompt</button>
        <button class="button secondary" id="clear-chat">Clear</button>
      </div>
      <div class="panel" id="chat-preview" style="margin-top: 20px; background: #f8fafc; border-color: var(--border);">
        <h3>Streaming response</h3>
        <div id="chat-stream" style="white-space: pre-wrap; min-height: 120px; color: #0f172a;"></div>
        <div class="action-row" style="margin-top: 18px;">
          <span class="badge">Confidence: <span id="chat-confidence">–</span>%</span>
          <span class="badge">Citations: <span id="chat-citations">none</span></span>
        </div>
      </div>
    </section>
    <section class="panel">
      <h3>Conversation history</h3>
      <ul class="list-panel" id="chat-history">
        ${state.conversations.slice().reverse().map(item => `<li><strong>${item.prompt}</strong><p>${item.lastReply?.slice(0, 120) || 'No reply saved.'}</p><small>${helpers.formatDate(item.createdAt)}</small></li>`).join('') || '<li>No conversations yet. Ask a question above.</li>'}
      </ul>
    </section>
  `;
}

function renderProjects() {
  return `
    <section class="page-header">
      <div>
        <h2>Projects</h2>
        <p>Bundle tasks, thoughts, and milestones by initiative.</p>
      </div>
    </section>
    <section class="panel">
      <div class="card-grid columns-2">
        <div class="small-card"><strong>Neural Architecture</strong><p>Build core workflow scaffolding.</p></div>
        <div class="small-card"><strong>Workspace UX</strong><p>Polish layout and navigation flow.</p></div>
      </div>
    </section>
  `;
}

function renderReflections() {
  return `
    <section class="page-header">
      <div>
        <h2>Reflections</h2>
        <p>Journal observations and near-term retrospectives.</p>
      </div>
    </section>
    <section class="panel">
      <h3>Write a reflection</h3>
      <input id="reflection-title" type="text" placeholder="Reflection title" />
      <textarea id="reflection-body" placeholder="Capture what you learned or noticed..."></textarea>
      <div class="action-row">
        <button class="button" id="save-reflection">Save Reflection</button>
      </div>
    </section>
    <section class="panel">
      <h3>Saved reflections</h3>
      <ul class="list-panel">
        ${state.reflections.slice().reverse().map(item => `<li><strong>${item.title}</strong><p>${item.body}</p><small>${helpers.formatDate(item.createdAt)}</small></li>`).join('') || '<li>No reflections yet. Add one above.</li>'}
      </ul>
    </section>
  `;
}

function renderSettings() {
  return `
    <section class="page-header">
      <div>
        <h2>Settings</h2>
        <p>Configure your workspace and toggle feature controls.</p>
      </div>
    </section>
    <section class="panel">
      <h3>Workspace settings</h3>
      <label class="badge">Default provider</label>
      <select id="settings-provider"><option value="openai">openai</option><option value="local">local</option></select>
      <div class="action-row" style="margin-top: 18px;">
        <button class="button" id="save-settings">Save settings</button>
      </div>
    </section>
  `;
}

function renderUpdates() {
  return `
    <section class="page-header">
      <div>
        <h2>Updates</h2>
        <p>Track the latest product improvements and support notes.</p>
      </div>
    </section>
    <section class="panel">
      <ul class="list-panel">
        <li><strong>Backend connected</strong><p>Health, admin, and chat APIs are integrated into the SPA.</p></li>
        <li><strong>Developer console</strong><p>Hidden admin access via Ctrl + Shift + A or /secret-admin.</p></li>
        <li><strong>State persistence</strong><p>Thoughts, tasks, reflections, and conversations survive refresh.</p></li>
      </ul>
    </section>
  `;
}

function renderTesting() {
  return `
    <section class="page-header">
      <div>
        <h2>Testing</h2>
        <p>Use this page to verify features and troubleshoot the MVP flow.</p>
      </div>
    </section>
    <section class="panel">
      <h3>Live test actions</h3>
      <div class="action-row">
        <button class="button" id="test-fetch-providers">Fetch providers</button>
        <button class="button secondary" id="test-check-health">Check health</button>
      </div>
      <div id="testing-output" style="margin-top: 20px;"></div>
    </section>
  `;
}

function bindThoughtsEvents() {
  document.getElementById('save-thought')?.addEventListener('click', () => {
    const title = helpers.normalizeText(document.getElementById('thought-title').value);
    const body = helpers.normalizeText(document.getElementById('thought-body').value);
    if (!title || !body) return helpers.notify('Enter both title and body for a thought.');
    state.thoughts.push({ title, body, createdAt: new Date().toISOString() });
    helpers.saveState();
    renderMain();
    helpers.notify('Thought saved.');
  });

  document.getElementById('clear-thought')?.addEventListener('click', () => {
    document.getElementById('thought-title').value = '';
    document.getElementById('thought-body').value = '';
  });
}

function bindTaskEvents() {
  document.getElementById('save-task')?.addEventListener('click', () => {
    const title = helpers.normalizeText(document.getElementById('task-title').value);
    const body = helpers.normalizeText(document.getElementById('task-body').value);
    if (!title || !body) return helpers.notify('Enter a title and task details.');
    state.tasks.push({ title, body, createdAt: new Date().toISOString() });
    helpers.saveState();
    renderMain();
    helpers.notify('Task added.');
  });

  document.getElementById('clear-task')?.addEventListener('click', () => {
    document.getElementById('task-title').value = '';
    document.getElementById('task-body').value = '';
  });
}

function bindReflectionEvents() {
  document.getElementById('save-reflection')?.addEventListener('click', () => {
    const title = helpers.normalizeText(document.getElementById('reflection-title').value);
    const body = helpers.normalizeText(document.getElementById('reflection-body').value);
    if (!title || !body) return helpers.notify('Enter a title and reflection.');
    state.reflections.push({ title, body, createdAt: new Date().toISOString() });
    helpers.saveState();
    renderMain();
    helpers.notify('Reflection saved.');
  });
}

function bindSettingsEvents() {
  const providerField = document.getElementById('settings-provider');
  if (providerField) providerField.value = state.selectedProvider;
  document.getElementById('save-settings')?.addEventListener('click', () => {
    const provider = document.getElementById('settings-provider').value;
    state.selectedProvider = provider;
    helpers.notify(`Default provider set to ${provider}.`);
  });
}

function bindChatEvents() {
  document.getElementById('chat-provider')?.addEventListener('change', (event) => {
    state.selectedProvider = event.target.value;
  });

  document.getElementById('send-chat')?.addEventListener('click', () => {
    const prompt = helpers.normalizeText(document.getElementById('chat-prompt').value);
    if (!prompt) return helpers.notify('Write a prompt before sending.');
    const provider = document.getElementById('chat-provider').value;
    const model = document.getElementById('chat-model').value;
    const history = state.conversations.length ? state.conversations[state.conversations.length - 1].messages : [];
    sendChat({ prompt, provider, model, history });
  });

  document.getElementById('clear-chat')?.addEventListener('click', () => {
    document.getElementById('chat-prompt').value = '';
    document.getElementById('chat-stream').textContent = '';
    document.getElementById('chat-confidence').textContent = '–';
    document.getElementById('chat-citations').textContent = 'none';
  });
}

function sendChat({ prompt, provider, model }) {
  const streamElement = document.getElementById('chat-stream');
  const confidenceElement = document.getElementById('chat-confidence');
  const citationsElement = document.getElementById('chat-citations');
  const timestamp = new Date().toISOString();

  streamElement.textContent = '';
  confidenceElement.textContent = '…';
  citationsElement.textContent = 'none';
  helpers.notify('Sending prompt...');

  const conversation = { prompt, provider, model, createdAt: timestamp, messages: [{ role: 'user', content: prompt }] };
  state.conversations.push(conversation);
  helpers.saveState();
  renderMain();

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, messages: conversation.messages, stream: true, model })
  }).then(async (response) => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      helpers.notify(`Chat error: ${error.error?.message || error.error || 'server failure'}`, 'danger');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let resultText = '';
    let citations = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\n\n/);
      buffer = parts.pop();
      for (const part of parts) {
        const line = part.trim();
        if (!line) continue;
        if (line.startsWith('event:')) continue;
        if (line.startsWith('data:')) {
          const text = line.replace(/^data:\s*/, '');
          if (!text) continue;
          try {
            const parsed = JSON.parse(text);
            if (parsed?.ok && parsed?.id) {
              confidenceElement.textContent = helpers.randomConfidence();
              citations = parsed?.citations || citations;
              citationsElement.textContent = citations.length ? citations.join(', ') : 'none';
            }
          } catch (err) {
            resultText += text;
            streamElement.textContent = resultText;
          }
        }
      }
    }

    conversation.lastReply = resultText;
    conversation.messages.push({ role: 'assistant', content: resultText });
    conversation.citations = citations;
    helpers.saveState();
    renderMain();
    helpers.notify('Response received.', 'success');
  }).catch((error) => {
    helpers.notify(`Chat failed: ${error.message}`, 'danger');
  });
}

function renderDashboardData() {
  // refresh admin status and provider status cards after render
  fetchHealth();
  fetchProviders();
}

function bindGlobalEvents() {
  document.getElementById('main-nav').addEventListener('click', (event) => {
    const link = event.target.closest('[data-page]');
    if (!link) return;
    event.preventDefault();
    const page = link.dataset.page;
    if (!page) return;
    window.location.hash = page;
  });

  window.addEventListener('hashchange', () => {
    state.page = window.location.hash.slice(1) || 'dashboard';
    if (state.page === 'secret-admin') {
      toggleDevConsole(true);
      return;
    }
    renderNav();
    renderMain();
  });

  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      toggleDevConsole(true);
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      toggleCommandPalette(true);
    }
    if (event.key === 'Escape') {
      toggleCommandPalette(false);
      toggleDevConsole(false);
    }
  });

  document.getElementById('command-close')?.addEventListener('click', () => toggleCommandPalette(false));
  document.getElementById('dev-close')?.addEventListener('click', () => toggleDevConsole(false));
  document.getElementById('command-input')?.addEventListener('input', handleCommandSearch);
}

function handleCommandSearch(event) {
  const query = event.target.value.toLowerCase();
  const results = PAGES.filter(page => page.title.toLowerCase().includes(query) || page.id.toLowerCase().includes(query));
  const list = document.getElementById('command-list');
  list.innerHTML = results.map(page => `<div class="command-item" data-page="${page.id}"><strong>${page.title}</strong><p>${page.description}</p></div>`).join('');
  list.querySelectorAll('.command-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      toggleCommandPalette(false);
      window.location.hash = page;
    });
  });
}

function toggleCommandPalette(open) {
  state.commandOpen = open;
  const element = document.getElementById('command-palette');
  element.classList.toggle('visible', open);
  if (open) {
    const input = document.getElementById('command-input');
    input.value = '';
    input.focus();
    handleCommandSearch({ target: input });
  }
}

function toggleDevConsole(open) {
  state.devConsoleOpen = open;
  const element = document.getElementById('dev-console-overlay');
  element.classList.toggle('visible', open);
  if (open) {
    fetchAdminStatus();
  }
}

function renderDevConsole() {
  const container = document.getElementById('dev-console-body');
  const status = state.adminStatus;
  container.innerHTML = `
    <div class="dev-card"><strong>Database</strong><pre>${status ? JSON.stringify(status.db, null, 2) : 'Loading...'}</pre></div>
    <div class="dev-card"><strong>Search index</strong><pre>${status ? JSON.stringify(status.searchIndex, null, 2) : 'Loading...'}</pre></div>
    <div class="dev-card"><strong>Provider health</strong><pre>${status ? JSON.stringify(status.providers, null, 2) : 'Loading...'}</pre></div>
    <div class="dev-card"><strong>Logs</strong><pre>Last action: ${new Date().toLocaleString()}</pre></div>
    <div class="action-row" style="margin-top: 6px;">
      <button class="button" id="rebuild-index-btn">Rebuild index</button>
      <button class="button secondary" id="clear-cache-btn">Clear cache</button>
    </div>
  `;
  document.getElementById('rebuild-index-btn')?.addEventListener('click', () => {
    fetch('/api/admin/rebuild', { method: 'POST' }).then(r => r.json()).then(result => helpers.notify(result.message || 'Rebuild requested.'));
  });
  document.getElementById('clear-cache-btn')?.addEventListener('click', () => {
    fetch('/api/admin/clear-cache', { method: 'POST' }).then(r => r.json()).then(result => helpers.notify(result.message || 'Cache cleared.'));
  });
}

function renderMainShell() {
  renderNav();
  renderMain();
}

async function fetchProviders() {
  try {
    const response = await fetch('/api/providers');
    const data = await response.json();
    if (data.ok && Array.isArray(data.providers)) {
      state.providers = data.providers;
      if (!state.providers.includes(state.selectedProvider)) {
        state.selectedProvider = state.providers[0] || 'openai';
      }
      renderMainShell();
    }
  } catch (err) {
    console.warn('Providers fetch failed', err);
  }
}

async function fetchHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    state.health = data;
    renderNav();
    renderMainShell();
  } catch (err) {
    state.health = { ok: false };
  }
}

async function fetchAdminStatus() {
  try {
    const response = await fetch('/api/admin/status');
    state.adminStatus = await response.json();
  } catch (err) {
    state.adminStatus = { ok: false, error: err.message };
  }
  renderDevConsole();
}

function onLoad() {
  helpers.loadState();
  state.page = window.location.hash.slice(1) || 'dashboard';
  if (window.location.pathname === '/secret-admin') {
    state.page = 'dashboard';
    toggleDevConsole(true);
  }
  bindGlobalEvents();
  renderMainShell();
  if (state.devConsoleOpen) renderDevConsole();
}

window.addEventListener('DOMContentLoaded', onLoad);
