import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { HashingService } from '../hashing/hashing.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Проверяет пару «имя пользователя и пароль».
   * Используется локальной Passport-стратегией.
   */
  async validatePair(username: string, password: string): Promise<User> {
    let user: User;

    try {
      user = await this.usersService.findOne({ where: { username } });
    } catch {
      throw new UnauthorizedException('Неправильный логин или пароль');
    }

    const isPasswordValid = await this.hashingService.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неправильный логин или пароль');
    }

    return user;
  }

  register(createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  login(user: User): { access_token: string } {
    const payload = { sub: user.id, username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
