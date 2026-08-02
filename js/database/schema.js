export const SCHEMA = {
  name: 'clarity-db',
  version: 1,
  stores: [
    { name: 'users', options: { keyPath: 'id' }, indexes: ['id'] },
    { name: 'thoughts', options: { keyPath: 'id' }, indexes: ['userId', 'createdAt'] },
    { name: 'tasks', options: { keyPath: 'id' }, indexes: ['userId', 'createdAt'] },
    { name: 'reflections', options: { keyPath: 'id' }, indexes: ['userId', 'createdAt'] },
    { name: 'memories', options: { keyPath: 'id' }, indexes: ['userId', 'sourceId', 'createdAt'] },
    { name: 'embeddings', options: { keyPath: 'id' }, indexes: ['memoryId'] },
    { name: 'conversations', options: { keyPath: 'id' }, indexes: ['userId', 'updatedAt'] },
    { name: 'invertedIndex', options: { keyPath: 'token' }, indexes: [] }
  ]
};
