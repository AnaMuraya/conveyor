import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Conveyor API')
    .setDescription(
      'Reliable AI task platform — submit tasks and poll their status while the ' +
        'slow LLM work runs asynchronously behind the API.',
    )
    .setVersion('0.1.0')
    .addTag('tasks', 'Submit tasks and poll their status')
    .addTag('health', 'Liveness probe')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 8000;
  await app.listen(port);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
