import { Injectable } from '@nestjs/common';

import { LlmProvider, LlmResult } from './llm-provider.interface';

/**
 * Placeholder provider that echoes the prompt straight back. It exists so the
 * adapter seam is real and exercised from the start; a real provider replaces it
 * later without touching any caller.
 *
 * `ECHO_LATENCY_MS` (default 0) injects an artificial delay so the asynchronous
 * pipeline is observable — with it set, a task lingers in `running` long enough
 * to poll. It stands in for the slow real LLM the reliability work is built
 * around.
 */
@Injectable()
export class EchoLlmProvider implements LlmProvider {
  readonly name = 'echo';

  private readonly latencyMs = Number(process.env.ECHO_LATENCY_MS ?? 0);

  async generate(prompt: string): Promise<LlmResult> {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }
    return { output: prompt, model: this.name };
  }
}
