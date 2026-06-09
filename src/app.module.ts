import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LlmModule } from './llm/llm.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [TasksModule, LlmModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
