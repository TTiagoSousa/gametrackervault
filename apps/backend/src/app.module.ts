import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SystemModule } from './system/system.module';
import { GamesModule } from './games/games.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { LibraryModule } from './library/library.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    SystemModule,
    GamesModule,
    IntegrationsModule,
    LibraryModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
