import { Repository } from './database/repository.js';
import EventBus from './utils/events.js';

async function initThoughtsUI() {
  await Repository.init();
  const input = document.getElementById('thoughtInput');
  const saveBtn = document.getElementById('saveThoughtBtn');
  const tagPro = document.getElementById('tagProcrastin');
  const tagIdea = document.getElementById('tagIdea');
  const charCount = document.getElementById('charCount');

  let category = 'unclear';

  if (!input || !saveBtn) return;

  input.addEventListener('input', () => {
    charCount.textContent = `${input.value.length} chars`;
  });

  tagPro?.addEventListener('click', () => { category = 'procrastination'; });
  tagIdea?.addEventListener('click', () => { category = 'idea'; });

  saveBtn.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return;
    const userId = localStorage.getItem('clarity_user') || 'local';
    const thought = { id: crypto.randomUUID(), userId, text, category, createdAt: new Date().toISOString() };
    await Repository.saveThought(thought);
    // Index as memory
    const memory = { id: crypto.randomUUID(), userId, sourceId: thought.id, text: thought.text, type: 'thought', category: thought.category, createdAt: thought.createdAt };
    await Repository.memory.add(memory);
    input.value = '';
    charCount.textContent = '0 chars';
  });
}

document.addEventListener('DOMContentLoaded', initThoughtsUI);
