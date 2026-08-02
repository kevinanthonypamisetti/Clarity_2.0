import Vectorizer from './vectorizer.js';
import { computeIdf, tfToTfidf } from './tfidf.js';

export class KnowledgeIndex {
  constructor() {
    this.vectorizer = new Vectorizer();
    this.docs = new Map(); // id -> {id, source, text, metadata, tf, tfidf}
    this.docFreqs = {}; // token -> df
    this.totalDocs = 0;
    this.idToIndexPos = new Map();
  }

  rebuild() {
    // rebuild vocab from all docs and recompute tfidf vectors
    this.vectorizer = new Vectorizer();
    this.docFreqs = {};
    this.totalDocs = 0;
    const all = Array.from(this.docs.values()).map(d => d.text);
    all.forEach(t => {
      const tokens = this.vectorizer.addDocument(t);
      const unique = new Set(tokens);
      unique.forEach(u => { this.docFreqs[u] = (this.docFreqs[u] || 0) + 1; });
      this.totalDocs++;
    });
    // compute idf mapping aligned to vocab token order
    const { tokens: idfTokens } = computeIdf(this.docFreqs, this.totalDocs);
    // recompute tfidf for each doc
    for (const d of this.docs.values()) {
      const tokens = this.vectorizer.textToTokens(d.text);
      const tfVec = this.vectorizer.tokensToTfVector(tokens);
      // build idfVec aligned with tfVec length
      const idfVec = new Float32Array(tfVec.length);
      // since computeIdf returns idf matching keys order, but here we keep tokens in vectorizer.vocab order
      // approximate by setting idf=log((1+N)/(1+df))+1 per token index
      for (const [tok, idx] of this.vectorizer.vocab.entries()) {
        const df = this.docFreqs[tok] || 0;
        idfVec[idx] = Math.log((1 + this.totalDocs) / (1 + df)) + 1;
      }
      d.tfidf = tfToTfidf(tfVec, idfVec);
    }
  }

  add(doc) {
    // doc: { id, text, source, metadata }
    if (this.docs.has(doc.id)) return this.update(doc.id, doc);
    this.docs.set(doc.id, { ...doc });
    this.totalDocs++;
    const tokens = this.vectorizer.addDocument(doc.text);
    const unique = new Set(tokens);
    unique.forEach(u => { this.docFreqs[u] = (this.docFreqs[u] || 0) + 1; });
    // recompute all tfidf because vocab may have grown
    this.rebuild();
    return doc;
  }

  update(id, doc) {
    if (!this.docs.has(id)) return this.add(doc);
    this.docs.set(id, { ...doc });
    this.rebuild();
    return doc;
  }

  remove(id) {
    if (!this.docs.has(id)) return false;
    this.docs.delete(id);
    this.rebuild();
    return true;
  }

  stats() {
    return { totalDocs: this.totalDocs, vocabSize: this.vectorizer.nextIndex };
  }

  cosine(a, b) {
    const n = Math.min(a.length, b.length);
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < n; i++) { dot += (a[i] || 0) * (b[i] || 0); na += (a[i] || 0) * (a[i] || 0); nb += (b[i] || 0) * (b[i] || 0); }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  query(queryText, topK = 5) {
    const qTokens = this.vectorizer.addDocument(queryText);
    const qTf = this.vectorizer.tokensToTfVector(qTokens);
    // build idf vector
    const idfVec = new Float32Array(this.vectorizer.nextIndex);
    for (const [tok, idx] of this.vectorizer.vocab.entries()) {
      const df = this.docFreqs[tok] || 0;
      idfVec[idx] = Math.log((1 + this.totalDocs) / (1 + df)) + 1;
    }
    const qTfidf = tfToTfidf(qTf, idfVec);

    const scored = [];
    for (const d of this.docs.values()) {
      const sim = this.cosine(qTfidf, d.tfidf || new Float32Array(this.vectorizer.nextIndex));
      scored.push({ id: d.id, source: d.source, text: d.text, metadata: d.metadata, tfidf: d.tfidf, score: sim });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(s => ({ ...s, score: s.score }));
  }
}

export default KnowledgeIndex;
