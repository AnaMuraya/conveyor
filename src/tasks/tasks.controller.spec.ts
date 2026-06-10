import { Test, TestingModule } from '@nestjs/testing';

import { Task } from './task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

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

  it('delegates creation to the service', async () => {
    const dto = { type: 'summarize', payload: { text: 'hi' } };
    const created = { id: 'task-1' } as Task;
    service.create.mockResolvedValue(created);

    await expect(controller.create(dto)).resolves.toBe(created);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates lookup to the service', async () => {
    const task = { id: 'task-1' } as Task;
    service.findOne.mockResolvedValue(task);

    await expect(controller.findOne('task-1')).resolves.toBe(task);
    expect(service.findOne).toHaveBeenCalledWith('task-1');
  });
});
