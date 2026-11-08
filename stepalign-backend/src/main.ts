import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export const configureApp = (app: {
  useGlobalPipes: (...pipes: ValidationPipe[]) => unknown;
}) =>
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

if (require.main === module) {
  void bootstrap();
}
