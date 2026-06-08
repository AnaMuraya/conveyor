import { Injectable } from '@nestjs/common';
import { LlmProvider, LlmResult } from './llm-provider.interface';

/**
 * Placeholder provider that echoes the prompt straight back. It exists so the
 * adapter seam is real and exercised from the start; a real provider replaces it
 * later without touching any caller.
 */
@Injectable()
export class EchoLlmProvider implements LlmProvider {
  readonly name = 'echo';

  generate(prompt: string): Promise<LlmResult> {
    return Promise.resolve({ output: prompt, model: this.name });
  }
}
