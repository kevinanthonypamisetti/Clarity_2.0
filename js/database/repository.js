import { DB } from './database.js';
import { runMigrations } from './migrations.js';
import { MemoryRepo } from './memoryRepository.js';
import { ConversationRepo } from './conversationRepository.js';
import EventBus from '../utils/events.js';
import { rebuildIndexFromList, indexMemory, removeMemory } from '../rag/search.js';

export const Repository = {
  async init() {
    await DB.init();
    await runMigrations();
    try {
      // Load all memories and build in-memory index
      const allMemories = await DB.getAll('memories');
      if (Array.isArray(allMemories)) {
        rebuildIndexFromList(allMemories);
        EventBus.emit('clarity:index-rebuilt', { total: allMemories.length });
      }
    } catch (e) {
      EventBus.emit('clarity:error', { module: 'repository', error: e?.message, stack: e?.stack });
    }

    // listen to repository memory events to update index incrementally
    EventBus.on('clarity:memory-created', (ev) => {
      try { indexMemory(ev.detail.memory); EventBus.emit('clarity:index-updated', { id: ev.detail.memory.id }); } catch (e) { EventBus.emit('clarity:error', { module: 'repository', error: e?.message, stack: e?.stack }); }
    });
    EventBus.on('clarity:memory-updated', (ev) => {
      try { indexMemory(ev.detail.memory); EventBus.emit('clarity:index-updated', { id: ev.detail.memory.id }); } catch (e) { EventBus.emit('clarity:error', { module: 'repository', error: e?.message, stack: e?.stack }); }
    });
    EventBus.on('clarity:memory-deleted', (ev) => {
      try { removeMemory(ev.detail.id); EventBus.emit('clarity:index-updated', { id: ev.detail.id }); } catch (e) { EventBus.emit('clarity:error', { module: 'repository', error: e?.message, stack: e?.stack }); }
    });
  },
  // Thoughts
  async saveThought(thought) { return DB.put('thoughts', thought); },
  async fetchThought(id) { return DB.get('thoughts', id); },
  async fetchThoughtsByUser(userId) { return DB.queryIndex('thoughts', 'userId', userId); },
  // Memories
  memory: MemoryRepo,
  // Conversations
  conversation: ConversationRepo
};
