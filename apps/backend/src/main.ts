import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // In the container requests arrive via the local nginx; trusting only it (loopback) makes
  // req.secure reflect Nginx Proxy Manager's https, which decides the secure cookie.
  // Direct connections from other IPs still cannot fake the protocol.
  app.set('trust proxy', 'loopback');

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  // systemd stops the service with SIGTERM; without this Nest doesn't run
  // onModuleDestroy and the Postgres connections are left open.
  app.enableShutdownHooks();

  // In the container the backend only needs to listen to nginx (HOST=127.0.0.1); in
  // development it listens on all interfaces, as before.
  const port = process.env.PORT ?? 3000;
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}

void bootstrap();
