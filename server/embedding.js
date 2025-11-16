const VECTOR_SIZE = 384;

const tokenize = (text) => text.toLowerCase().match(/[a-zA-Z0-9]+/g) ?? [];

const hashToken = (token) => {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % VECTOR_SIZE;
};

export function embedText(text) {
  const tokens = tokenize(text);
  const vector = new Array(VECTOR_SIZE).fill(0);
  if (tokens.length === 0) return vector;

  tokens.forEach(token => {
    const index = hashToken(token);
    vector[index] += 1;
  });

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return vector;
  return vector.map(value => value / norm);
}
