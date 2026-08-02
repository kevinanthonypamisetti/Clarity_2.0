// Lightweight tokenizer with stopword removal and simple stemming
const STOPWORDS = new Set([
  'the','and','for','that','this','with','you','your','are','was','were','have','has','had','but','not','from','they','will','what','when','where','which','their','them','then','there','about','would','could','should','into','out','it's','its','it's'
]);

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function simpleStem(word) {
  // very small stemmer: handle common suffixes
  if (word.length <= 4) return word;
  if (word.endsWith('ing')) return word.slice(0, -3);
  if (word.endsWith('ed')) return word.slice(0, -2);
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

export function tokenize(text, { minLength = 3, removeStopwords = true } = {}) {
  const norm = normalize(text);
  if (!norm) return [];
  const parts = norm.split(' ').map(simpleStem).filter(Boolean).filter(w => w.length >= minLength);
  if (removeStopwords) return parts.filter(p => !STOPWORDS.has(p));
  return parts;
}

export default tokenize;
