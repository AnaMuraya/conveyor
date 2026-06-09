import { Test, TestingModule } from '@nestjs/testing';

import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksController', () => {
  let controller: TasksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [TasksService],
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  it('creates a task and reads it back by id', () => {
    const created = controller.create({
      type: 'summarize',
      payload: { text: 'hi' },
    });

    expect(controller.findOne(created.id)).toBe(created);
  });
});
