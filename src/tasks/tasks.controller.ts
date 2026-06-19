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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
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
  create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Task> {
    return this.tasksService.create(createTaskDto, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a task by id' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'The task id returned when it was submitted.',
  })
  @ApiOkResponse({ description: 'The task.', type: Task })
  @ApiNotFoundResponse({
    description: 'No task with that id is visible to the caller.',
  })
  @ApiBadRequestResponse({ description: 'The id is not a valid UUID.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Task> {
    return this.tasksService.findOne(id, user);
  }
}
