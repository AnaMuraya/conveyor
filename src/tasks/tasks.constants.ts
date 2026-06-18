/**
 * Name of the BullMQ queue that carries task jobs from the API (producer) to
 * the worker (consumer). Shared so both sides agree on the hand-off point.
 */
export const TASKS_QUEUE = 'tasks';

/** Job name used for task-processing jobs on the {@link TASKS_QUEUE}. */
export const PROCESS_TASK_JOB = 'process-task';

/** Payload carried by a {@link PROCESS_TASK_JOB} — just the id; the worker
 * loads the task from Postgres (the queue is a trigger, not the source of
 * truth). */
export interface ProcessTaskJob {
  taskId: string;
}
