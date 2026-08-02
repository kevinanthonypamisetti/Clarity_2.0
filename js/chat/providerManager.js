// ProviderManager: register and manage AI providers
const providers = new Map();
let activeName = null;

export const ProviderManager = {
  register(name, impl) {
    if (!name || !impl) throw new Error('register(name, impl) required');
    providers.set(name, impl);
    if (!activeName) activeName = name;
    return impl;
  },

  get(name) {
    if (!name) return this.getActive();
    return providers.get(name) || null;
  },

  setActive(name) {
    if (!providers.has(name)) throw new Error('Unknown provider: ' + name);
    activeName = name;
    return providers.get(name);
  },

  getActive() {
    if (!activeName && providers.size > 0) activeName = Array.from(providers.keys())[0];
    return providers.get(activeName) || null;
  },

  listProviders() {
    return Array.from(providers.keys());
  },

  async healthCheck(name) {
    const p = this.get(name);
    if (!p) return { ok: false, reason: 'not-found' };
    if (typeof p.healthCheck === 'function') {
      try {
        return await p.healthCheck();
      } catch (e) {
        return { ok: false, reason: e.message };
      }
    }
    return { ok: true };
  }
};

// expose globally
if (typeof window !== 'undefined') {
  window.ClarityAI = window.ClarityAI || {};
  window.ClarityAI.providerManager = window.ClarityAI.providerManager || ProviderManager;
}

export default ProviderManager;
