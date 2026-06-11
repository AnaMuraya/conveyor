import type { Job } from 'bullmq';
import type { Repository } from 'typeorm';

import { LlmProvider } from '../llm/llm-provider.interface';
import { Task } from './task.entity';
import { TaskProcessor } from './task.processor';
import { ProcessTaskJob } from './tasks.constants';

type RepoMock = {
  findOneBy: jest.Mock;
  update: jest.Mock;
};

function createRepoMock(): RepoMock {
  return {
    findOneBy: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  };
}

function createLlmMock(): LlmProvider & { generate: jest.Mock } {
  return {
    name: 'echo',
    generate: jest.fn().mockResolvedValue({ output: 'echoed', model: 'echo' }),
  };
}

function job(
  taskId: string,
  overrides: Partial<Job<ProcessTaskJob>> = {},
): Job<ProcessTaskJob> {
  return {
    id: 'job-1',
    data: { taskId },
    opts: { attempts: 3 },
    attemptsMade: 0,
    ...overrides,
  } as Job<ProcessTaskJob>;
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    type: 'summarize',
    payload: { text: 'hello' },
    status: 'pending',
    result: null,
    ...overrides,
  } as Task;
}

describe('TaskProcessor', () => {
  let repo: RepoMock;
  let llm: LlmProvider & { generate: jest.Mock };
  let processor: TaskProcessor;

  beforeEach(() => {
    repo = createRepoMock();
    llm = createLlmMock();
    processor = new TaskProcessor(repo as unknown as Repository<Task>, llm);
  });

  describe('process', () => {
    it('runs a pending task: running → generate → done with the result', async () => {
      repo.findOneBy.mockResolvedValue(task());

      await processor.process(job('t1'));

      // Marks running before the slow call, then done after.
      expect(repo.update).toHaveBeenNthCalledWith(1, 't1', {
        status: 'running',
      });
      expect(llm.generate).toHaveBeenCalledWith('hello');
      expect(repo.update).toHaveBeenNthCalledWith(2, 't1', {
        status: 'done',
        result: 'echoed',
      });
    });

    // The headline reliability test: a redelivered job must not re-run the LLM
    // or overwrite a finished result.
    it('skips a task that is no longer pending (duplicate delivery)', async () => {
      repo.findOneBy.mockResolvedValue(task({ status: 'done', result: 'x' }));

      await processor.process(job('t1'));

      expect(llm.generate).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('drops the job if the task no longer exists', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await processor.process(job('gone'));

      expect(llm.generate).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('onFailed', () => {
    it('does not mark failed while retries remain', async () => {
      await processor.onFailed(
        job('t1', { attemptsMade: 1 }),
        new Error('boom'),
      );

      expect(repo.update).not.toHaveBeenCalled();
    });

    it('marks the task failed once attempts are exhausted', async () => {
      await processor.onFailed(
        job('t1', { attemptsMade: 3 }),
        new Error('boom'),
      );

      expect(repo.update).toHaveBeenCalledWith('t1', { status: 'failed' });
    });
  });
});
