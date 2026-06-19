import { Test, TestingModule } from '@nestjs/testing';

import type { AuthenticatedUser } from '../auth/auth.types';
import { Task } from './task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

const user: AuthenticatedUser = {
  userId: 'user-1',
  username: 'ana',
  roles: ['user'],
};

describe('TasksController', () => {
  let controller: TasksController;
  const service = {
    create: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: service }],
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates creation to the service with the caller as owner', async () => {
    const dto = { type: 'summarize', payload: { text: 'hi' } };
    const created = { id: 'task-1' } as Task;
    service.create.mockResolvedValue(created);

    await expect(controller.create(dto, user)).resolves.toBe(created);
    expect(service.create).toHaveBeenCalledWith(dto, user.userId);
  });

  it('delegates lookup to the service with the caller', async () => {
    const task = { id: 'task-1' } as Task;
    service.findOne.mockResolvedValue(task);

    await expect(controller.findOne('task-1', user)).resolves.toBe(task);
    expect(service.findOne).toHaveBeenCalledWith('task-1', user);
  });
});
