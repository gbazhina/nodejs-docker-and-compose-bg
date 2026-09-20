import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'kupipodariday-secret',
        signOptions: {
          // expiresIn ожидает число секунд (или строго типизированный литерал
          // вида '7d'), поэтому берём число секунд из .env с запасным
          // значением 7 дней.
          expiresIn:
            Number(process.env.JWT_EXPIRES_IN_SECONDS) || 60 * 60 * 24 * 7,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
