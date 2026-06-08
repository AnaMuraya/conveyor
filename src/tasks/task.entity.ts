export type TaskStatus = 'pending' | 'running' | 'done' | 'failed';

/**
 * A unit of work submitted to Relay. Week 1 keeps these in memory; week 2 maps
 * the same shape onto a Postgres table (ADR-0004).
 */
export interface Task {
  id: string;
  /** Discriminator for the kind of work, e.g. 'summarize'. */
  type: string;
  /** Arbitrary input for the task — the eventual LLM prompt material. */
  payload: Record<string, unknown>;
  status: TaskStatus;
  /** The processing result once done, or null while pending/running/failed. */
  result: string | null;
  createdAt: Date;
  updatedAt: Date;
}
