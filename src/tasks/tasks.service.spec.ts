import { NotFoundException } from '@nestjs/common';

import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(() => {
    service = new TasksService();
  });

  describe('create', () => {
    it('returns a pending task with an id and timestamps', () => {
      const task = service.create({
        type: 'summarize',
        payload: { text: 'hi' },
      });

      expect(task.id).toEqual(expect.any(String));
      expect(task.status).toBe('pending');
      expect(task.result).toBeNull();
      expect(task.type).toBe('summarize');
      expect(task.payload).toEqual({ text: 'hi' });
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('assigns a distinct id to each task', () => {
      const a = service.create({ type: 'summarize', payload: {} });
      const b = service.create({ type: 'summarize', payload: {} });

      expect(a.id).not.toBe(b.id);
    });
  });

  describe('findOne', () => {
    it('returns the task that was created', () => {
      const created = service.create({ type: 'summarize', payload: {} });

      expect(service.findOne(created.id)).toBe(created);
    });

    // Failure path is the headline test.
    it('throws NotFoundException for an unknown id', () => {
      expect(() => service.findOne('does-not-exist')).toThrow(
        NotFoundException,
      );
    });
  });
});
