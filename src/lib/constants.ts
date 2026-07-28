// Dimension of the Voyage embedding vectors (voyage-3-lite → 512).
export const EMBEDDING_DIM = 512;

// Course generation (adaptive thinking + effort) stays on Opus.
export const MODEL = "claude-opus-4-8";

// Fast per-sentence correction + analysis use Haiku for speed/cost.
export const FAST_MODEL = "claude-haiku-4-5";

// Grammar checks (per-sentence correction + analysis) run on OpenAI's
// GPT-4o-mini — cheaper per token than Haiku for this high-volume path.
export const GRAMMAR_MODEL = "gpt-4o-mini";
