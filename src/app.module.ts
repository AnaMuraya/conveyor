import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksModule } from './tasks/tasks.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [TasksModule, LlmModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
