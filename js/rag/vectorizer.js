import { tokenize } from './tokenizer.js';

export class Vectorizer {
  constructor() {
    this.vocab = new Map(); // token -> index
    this.nextIndex = 0;
  }

  ensureToken(token) {
    if (!this.vocab.has(token)) {
      this.vocab.set(token, this.nextIndex++);
    }
    return this.vocab.get(token);
  }

  ensureTokens(tokens) {
    tokens.forEach(t => this.ensureToken(t));
  }

  tokensToTfVector(tokens) {
    // returns dense Float32Array aligned to current vocab
    const vec = new Float32Array(this.nextIndex || 0);
    tokens.forEach(t => {
      const i = this.vocab.get(t);
      if (i !== undefined) vec[i] += 1;
    });
    return vec;
  }

  textToTokens(text) { return tokenize(text); }

  addDocument(text) {
    const tokens = this.textToTokens(text);
    this.ensureTokens(tokens);
    return tokens;
  }
}

export default Vectorizer;
