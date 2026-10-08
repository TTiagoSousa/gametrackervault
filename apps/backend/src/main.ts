import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // No container os pedidos chegam pelo nginx local; confiar só nele (loopback) faz o
  // req.secure refletir o https do Nginx Proxy Manager, que decide o cookie seguro.
  // Ligações diretas de outros IPs continuam a não poder fingir o protocolo.
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

  // O systemd para o serviço com SIGTERM; sem isto o Nest não corre o
  // onModuleDestroy e as ligações ao Postgres ficam por fechar.
  app.enableShutdownHooks();

  // No container o backend só precisa de ouvir o nginx (HOST=127.0.0.1); em
  // desenvolvimento fica em todas as interfaces, como antes.
  const port = process.env.PORT ?? 3000;
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}

void bootstrap();
