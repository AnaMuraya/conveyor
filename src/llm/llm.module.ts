import { Module } from '@nestjs/common';

import { EchoLlmProvider } from './echo-llm.provider';
import { LLM_PROVIDER } from './llm-provider.interface';

/**
 * Owns the LLM adapter seam. Binds the {@link LLM_PROVIDER} token to a concrete
 * provider in one place, so swapping Echo → Ollama → hosted is a single-line
 * change here. Nothing consumes the provider yet — task processing wires in the
 * LLM call later.
 */
@Module({
  providers: [{ provide: LLM_PROVIDER, useClass: EchoLlmProvider }],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
