import { SCHEMA } from './schema.js';

function openIndexedDB(name = SCHEMA.name, version = SCHEMA.version) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      SCHEMA.stores.forEach(s => {
        if (!db.objectStoreNames.contains(s.name)) {
          const store = db.createObjectStore(s.name, s.options || { keyPath: 'id' });
          (s.indexes || []).forEach(ix => store.createIndex(ix, ix, { unique: false }));
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

class ClarityDB {
  constructor() { this.db = null; }
  async init() { this.db = await openIndexedDB(); }
  _tx(storeNames, mode = 'readonly') {
    const tx = this.db.transaction(storeNames, mode);
    return tx;
  }
  async put(storeName, value) {
    const tx = this._tx([storeName], 'readwrite');
    return new Promise((res, rej) => {
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
  async get(storeName, key) {
    const tx = this._tx([storeName], 'readonly');
    return new Promise((res, rej) => {
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
  async getAll(storeName, query) {
    const tx = this._tx([storeName], 'readonly');
    return new Promise((res, rej) => {
      const store = tx.objectStore(storeName);
      const req = store.getAll(query);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
  async del(storeName, key) {
    const tx = this._tx([storeName], 'readwrite');
    return new Promise((res, rej) => {
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    });
  }
  async queryIndex(storeName, indexName, value, rangeOp = 'equals') {
    const tx = this._tx([storeName], 'readonly');
    return new Promise((res, rej) => {
      const store = tx.objectStore(storeName);
      const ix = store.index(indexName);
      const req = ix.getAll(value);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
}

export const DB = new ClarityDB();
