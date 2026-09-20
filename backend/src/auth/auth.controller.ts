import {
  Body,
  Controller,
  Post,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/entities/user.entity';

type AuthenticatedRequest = Request & { user: User };

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @SerializeOptions({ groups: ['profile-owner'] })
  @Post('signup')
  signUp(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.authService.register(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('signin')
  signIn(@Req() req: AuthenticatedRequest): { access_token: string } {
    return this.authService.login(req.user);
  }
}
