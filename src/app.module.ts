import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { dataSourceOptions } from './config/data-source';
import { LlmModule } from './llm/llm.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [TypeOrmModule.forRoot(dataSourceOptions), TasksModule, LlmModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
