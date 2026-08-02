import { Repository } from './database/repository.js';
import EventBus from './utils/events.js';
import * as RAG from './rag/search.js';
import ProviderManager from './chat/providerManager.js';
import './chat/remoteProvider.js';

async function boot() {
  EventBus.emit('clarity:debug', { module: 'bootstrap', message: 'Clarity bootstrap starting', timestamp: Date.now() });
  try {
    await Repository.init();
    EventBus.emit('clarity:debug', { module: 'bootstrap', message: 'Repository initialized', timestamp: Date.now() });
    // expose ClarityAI bridge
    window.ClarityAI = window.ClarityAI || {};
    // expose event bus for UI integrations
    window.ClarityAI.eventBus = EventBus;
    window.ClarityAI.search = (q, k = 5) => RAG.search(q, k);
    // expose repository for debugging/testing (IndexedDB operations)
    window.ClarityAI.repository = Repository;
    // register any discovered providers with ProviderManager
    try {
      const pm = window.ClarityAI.providerManager || ProviderManager;
      window.ClarityAI.providerManager = pm;
      // register providers present on window.ClarityAI.providers
      const regs = window.ClarityAI.providers || {};
      Object.keys(regs).forEach(n => {
        try { pm.register(n, regs[n]); } catch (e) { /* ignore */ }
      });
      // Prefer openai if available and healthy, otherwise fallback to local
      if (pm.listProviders().includes('openai')) {
        const health = await pm.healthCheck('openai');
        if (health?.ok) {
          pm.setActive('openai');
        } else if (pm.listProviders().includes('local')) {
          pm.setActive('local');
        }
      } else if (pm.listProviders().includes('local')) {
        pm.setActive('local');
      }
    } catch (e) {
      EventBus.emit('clarity:error', { module: 'bootstrap.provider', error: e?.message, stack: e?.stack });
    }
    window.ClarityAI.rebuild = () => {
      try {
        // reload from DB
        return (async () => {
          const all = await (await import('./database/database.js')).DB.getAll('memories');
          RAG.rebuildIndexFromList(all);
          EventBus.emit('clarity:index-rebuilt', { total: all.length });
          return all.length;
        })();
      } catch (e) { EventBus.emit('clarity:error', { module: 'bootstrap.rebuild', error: e?.message, stack: e?.stack }); }
    };
    window.ClarityAI.stats = () => RAG.indexStats();
    window.ClarityAI.clear = () => { /* clear index in memory */ RAG.rebuildIndexFromList([]); EventBus.emit('clarity:index-rebuilt', { total: 0 }); };

    EventBus.emit('clarity:debug', { module: 'bootstrap', message: 'ClarityAI bridge ready', timestamp: Date.now() });
    EventBus.emit('clarity:ai-ready', {});
  } catch (e) {
    EventBus.emit('clarity:error', { module: 'bootstrap', error: e.message, stack: e.stack });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
