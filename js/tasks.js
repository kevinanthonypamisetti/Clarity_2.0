import { Repository } from './database/repository.js';
import EventBus from './utils/events.js';

async function initTasksUI() {
  await Repository.init();
  const input = document.getElementById('taskInput');
  const addBtn = document.getElementById('addTaskBtn');
  const priority = document.getElementById('taskPriority');

  if (!input || !addBtn) return;

  addBtn.addEventListener('click', async () => {
    const title = input.value.trim();
    if (!title) return;
    const userId = localStorage.getItem('clarity_user') || 'local';
    const task = { id: crypto.randomUUID(), userId, title, priority: priority?.value || 'med', completed: false, createdAt: new Date().toISOString() };
    await Repository.saveTask ? Repository.saveTask(task) : Repository.saveThought(task); // fallback if saveTask not implemented
    // also index as memory for search
    const memory = { id: crypto.randomUUID(), userId, sourceId: task.id, text: task.title, type: 'task', category: task.priority, createdAt: task.createdAt };
    await Repository.memory.add(memory);
    input.value = '';
  });
}

document.addEventListener('DOMContentLoaded', initTasksUI);
