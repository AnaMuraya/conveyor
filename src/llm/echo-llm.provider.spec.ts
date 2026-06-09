import { EchoLlmProvider } from './echo-llm.provider';

describe('EchoLlmProvider', () => {
  const provider = new EchoLlmProvider();

  it('identifies itself as "echo"', () => {
    expect(provider.name).toBe('echo');
  });

  it('echoes the prompt back as the output', async () => {
    const result = await provider.generate('summarize this');

    expect(result).toEqual({ output: 'summarize this', model: 'echo' });
  });
});
