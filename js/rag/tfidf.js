// TF-IDF utilities

export function computeIdf(docFreqs, totalDocs) {
  const idf = new Float32Array(Object.keys(docFreqs).length);
  const tokens = Object.keys(docFreqs);
  tokens.forEach((t, i) => {
    const df = docFreqs[t] || 1;
    idf[i] = Math.log((1 + totalDocs) / (1 + df)) + 1; // smoothed idf
  });
  return { idf, tokens };
}

export function tfToTfidf(tfVec, idfVec) {
  const n = Math.max(tfVec.length, idfVec.length);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const tf = tfVec[i] || 0;
    const idf = idfVec[i] || 0;
    out[i] = tf * idf;
  }
  // normalize
  let norm = 0;
  for (let i = 0; i < out.length; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < out.length; i++) out[i] = out[i] / norm;
  return out;
}

export default { computeIdf, tfToTfidf };
