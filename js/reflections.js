import { Repository } from './database/repository.js';
import EventBus from './utils/events.js';

async function initReflectionsUI() {
  await Repository.init();
  const genBtn = document.getElementById('generateInsightBtn');
  if (!genBtn) return;
  genBtn.addEventListener('click', async () => {
    try {
      const userId = localStorage.getItem('clarity_user') || 'local';
      const text = window.prompt('Write your reflection (evening check-in):');
      if (!text || !text.trim()) return;
      const reflection = { id: crypto.randomUUID(), userId, prompt: 'evening-checkin', answer: text.trim(), createdAt: new Date().toISOString() };
      const memory = { id: crypto.randomUUID(), userId, sourceId: reflection.id, text: reflection.answer, type: 'reflection', category: 'checkin', createdAt: reflection.createdAt };
      await Repository.memory.add(memory);
      EventBus.emit('clarity:debug', { module: 'reflections', message: 'Reflection created', timestamp: Date.now() });
    } catch (err) {
      EventBus.emit('clarity:error', { module: 'reflections', error: err?.message, stack: err?.stack });
    }
  });
}

document.addEventListener('DOMContentLoaded', initReflectionsUI);
