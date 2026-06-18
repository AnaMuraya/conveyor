import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import type { Repository } from 'typeorm';

import type { LlmProvider } from '../llm/llm-provider.interface';
import { LLM_PROVIDER } from '../llm/llm-provider.interface';
import { Task } from './task.entity';
import { ProcessTaskJob, TASKS_QUEUE } from './tasks.constants';

/**
 * Consumes task jobs off the queue and runs them through the LLM provider,
 * off the request path. Only the worker process instantiates this — the API
 * never does — so killing the worker stops processing while the API keeps
 * accepting and queuing tasks; restarting it drains the backlog.
 *
 * Reliability properties this enforces:
 * - **Idempotent.** A job whose task is no longer `pending` is skipped, so a
 *   duplicate/redelivered job can't double-process (e.g. re-run the LLM and
 *   overwrite a finished result).
 * - **Retry then fail.** A thrown error lets BullMQ retry with backoff; only
 *   once attempts are exhausted does the task move to `failed`.
 */
@Processor(TASKS_QUEUE)
export class TaskProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskProcessor.name);

  constructor(
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>,
    @Inject(LLM_PROVIDER)
    private readonly llm: LlmProvider,
  ) {
    super();
  }

  async process(job: Job<ProcessTaskJob>): Promise<void> {
    const { taskId } = job.data;
    const task = await this.tasks.findOneBy({ id: taskId });

    if (!task) {
      // The row is the source of truth; if it's gone, the job has nothing to do.
      this.logger.warn(`Task ${taskId} not found — dropping job ${job.id}`);
      return;
    }

    if (task.status !== 'pending') {
      // Idempotency guard: already picked up or finished. A redelivered job
      // must not re-run the LLM or clobber an existing result.
      this.logger.log(
        `Task ${taskId} is '${task.status}', not 'pending' — skipping`,
      );
      return;
    }

    await this.tasks.update(taskId, { status: 'running' });

    const result = await this.llm.generate(this.toPrompt(task));

    await this.tasks.update(taskId, {
      status: 'done',
      result: result.output,
    });
    this.logger.log(`Task ${taskId} done via '${result.model}'`);
  }

  /**
   * Final-failure handler: BullMQ fires `failed` after every failed attempt.
   * Only when retries are exhausted do we record the task as `failed`, so a
   * task that succeeds on retry never shows `failed`.
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<ProcessTaskJob>, error: Error): Promise<void> {
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < attempts) {
      this.logger.warn(
        `Task ${job.data.taskId} attempt ${job.attemptsMade}/${attempts} ` +
          `failed: ${error.message} — will retry`,
      );
      return;
    }

    this.logger.error(
      `Task ${job.data.taskId} failed after ${attempts} attempts: ${error.message}`,
    );
    await this.tasks.update(job.data.taskId, { status: 'failed' });
  }

  /** Derive the prompt from the task payload. */
  private toPrompt(task: Task): string {
    const payload = task.payload;
    if (typeof payload.prompt === 'string') {
      return payload.prompt;
    }
    if (typeof payload.text === 'string') {
      return payload.text;
    }
    return JSON.stringify(payload);
  }
}
