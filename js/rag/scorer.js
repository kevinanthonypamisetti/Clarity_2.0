// Combine semantic similarity with recency and metadata to produce final score
export function scoreDocument({ semanticScore = 0, metadata = {} } = {}) {
  const now = Date.now();
  let recency = 0;
  if (metadata && metadata.createdAt) {
    const age = Math.max(0, now - new Date(metadata.createdAt).getTime());
    // recency in days
    const days = age / (1000 * 60 * 60 * 24);
    recency = Math.exp(-days / 30); // decays over ~30 days
  }

  const importance = metadata.importance || 0;
  const pinned = metadata.pinned ? 1 : 0;
  const favorite = metadata.favorite ? 1 : 0;

  const final = (semanticScore * 0.65) + (recency * 0.15) + (importance * 0.10) + (pinned * 0.05) + (favorite * 0.05);
  const confidence = Math.min(1, Math.max(0, final));
  return { score: final, confidence };
}

export default scoreDocument;
