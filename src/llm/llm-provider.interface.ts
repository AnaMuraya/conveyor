/**
 * The adapter seam between Relay and whatever actually performs generation.
 *
 * Week 1 ships only `EchoLlmProvider`; `OllamaProvider` arrives in week 4 and a
 * hosted provider in week 12 — each a drop-in replacement behind this interface,
 * swapped by configuration rather than by rewriting callers.
 *
 * See docs/adr/0003-llmprovider-adapter-seam.md.
 */
export interface LlmResult {
  /** The generated text. */
  output: string;
  /** Identifier of the model that produced the output (e.g. 'echo', 'llama3'). */
  model: string;
}

export interface LlmProvider {
  /** Human-readable provider name — handy in logs and responses. */
  readonly name: string;
  /** Generate a completion for the given prompt. */
  generate(prompt: string): Promise<LlmResult>;
}

/**
 * DI token. `LlmProvider` is a TypeScript interface and therefore erased at
 * runtime, so it cannot be injected by type — consumers inject this token.
 */
export const LLM_PROVIDER = 'LLM_PROVIDER';
