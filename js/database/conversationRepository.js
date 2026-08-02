import { DB } from './database.js';

export const ConversationRepo = {
  async createConversation({title = 'Conversation', userId = 'default', metadata = {}} = {}) {
    const id = crypto.randomUUID();
    const conv = {
      id,
      title,
      userId,
      metadata,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await DB.put('conversations', conv);
    return conv;
  },

  async getConversation(id) {
    return DB.get('conversations', id);
  },

  async listConversations({userId} = {}) {
    if (userId) return DB.queryIndex('conversations', 'userId', userId);
    return DB.getAll('conversations');
  },

  async appendMessage(conversationId, message = {}) {
    if (!conversationId) throw new Error('conversationId required');
    const conv = await DB.get('conversations', conversationId);
    if (!conv) throw new Error('conversation not found: ' + conversationId);
    if (!conv.messages) conv.messages = [];
    // normalize message
    const msg = Object.assign({}, message);
    if (!msg.id) msg.id = crypto.randomUUID();
    if (!msg.createdAt) msg.createdAt = new Date().toISOString();
    conv.messages.push(msg);
    conv.updatedAt = new Date().toISOString();
    await DB.put('conversations', conv);
    return msg;
  },

  async renameConversation(conversationId, newTitle) {
    const conv = await DB.get('conversations', conversationId);
    if (!conv) throw new Error('conversation not found: ' + conversationId);
    conv.title = newTitle;
    conv.updatedAt = new Date().toISOString();
    await DB.put('conversations', conv);
    return conv;
  },

  async deleteConversation(conversationId) {
    return DB.del('conversations', conversationId);
  },

  async searchConversations(query) {
    if (!query) return [];
    const all = await DB.getAll('conversations');
    const q = String(query).toLowerCase();
    return all.filter(c => {
      if ((c.title || '').toLowerCase().includes(q)) return true;
      if (Array.isArray(c.messages)) {
        for (const m of c.messages) {
          if ((m.content || '').toLowerCase().includes(q)) return true;
        }
      }
      return false;
    });
  },

  async exportConversation(conversationId) {
    const conv = await DB.get('conversations', conversationId);
    if (!conv) throw new Error('conversation not found: ' + conversationId);
    return JSON.stringify(conv);
  },

  async importConversation(jsonOrObj) {
    const conv = typeof jsonOrObj === 'string' ? JSON.parse(jsonOrObj) : jsonOrObj;
    if (!conv.id) conv.id = crypto.randomUUID();
    conv.updatedAt = new Date().toISOString();
    await DB.put('conversations', conv);
    return conv;
  },

  async summarizeConversation(conversationId, {maxMessages = 20} = {}) {
    const conv = await DB.get('conversations', conversationId);
    if (!conv) throw new Error('conversation not found: ' + conversationId);
    const msgs = (conv.messages || []).slice(-maxMessages).map(m => `${m.role}: ${m.content}`).join('\n');
    // lightweight local summary: first 800 chars
    const summary = msgs.slice(0, 800);
    return {summary, length: msgs.length};
  }
};

// Register global for convenience
if (typeof window !== 'undefined') {
  window.ClarityAI = window.ClarityAI || {};
  window.ClarityAI.conversationRepository = window.ClarityAI.conversationRepository || ConversationRepo;
}
