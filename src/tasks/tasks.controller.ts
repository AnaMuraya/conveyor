import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit a task',
    description:
      'Accepts a task and returns it immediately as `pending`. Processing ' +
      'happens asynchronously; poll `GET /tasks/:id` for the result.',
  })
  @ApiCreatedResponse({ description: 'Task accepted and queued.', type: Task })
  create(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(createTaskDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a task by id' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'The task id returned when it was submitted.',
  })
  @ApiOkResponse({ description: 'The task.', type: Task })
  @ApiNotFoundResponse({ description: 'No task exists with that id.' })
  @ApiBadRequestResponse({ description: 'The id is not a valid UUID.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Task> {
    return this.tasksService.findOne(id);
  }
}
