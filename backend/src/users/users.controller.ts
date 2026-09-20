import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { WishesService } from '../wishes/wishes.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindUsersDto } from './dto/find-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { Wish } from '../wishes/entities/wish.entity';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly wishesService: WishesService,
  ) {}

  /** Просмотр своего профиля (единственное место, где отдаётся email) */
  @SerializeOptions({ groups: ['profile-owner'] })
  @Get('me')
  getOwnProfile(@CurrentUser() user: AuthenticatedUser): Promise<User> {
    return this.usersService.findOne({ where: { id: user.id } });
  }

  /**
   * Редактирование своего профиля.
   * ID берётся строго из JWT-токена, поэтому изменить чужой профиль нельзя.
   */
  @SerializeOptions({ groups: ['profile-owner'] })
  @Patch('me')
  updateOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.updateOne({ id: user.id }, updateUserDto);
  }

  /** Удаление своего аккаунта (удалить чужой — невозможно, id берётся из JWT) */
  @Delete('me')
  removeOwnProfile(@CurrentUser() user: AuthenticatedUser): Promise<User> {
    return this.usersService.removeOne({ id: user.id });
  }

  /** Список подарков-хотелок текущего пользователя */
  @Get('me/wishes')
  getOwnWishes(@CurrentUser() user: AuthenticatedUser): Promise<Wish[]> {
    return this.wishesService.findMany({
      where: { owner: { id: user.id } },
      relations: { owner: true },
    });
  }

  /** Просмотр чужого (или своего) профиля по имени пользователя */
  @Get(':username')
  getUserProfile(@Param('username') username: string): Promise<User> {
    return this.usersService.findOne({ where: { username } });
  }

  /** Список подарков-хотелок произвольного пользователя по username */
  @Get(':username/wishes')
  getUserWishes(@Param('username') username: string): Promise<Wish[]> {
    return this.wishesService.findMany({
      where: { owner: { username } },
      relations: { owner: true },
    });
  }

  /**
   * Поиск пользователей по строке, которая может быть
   * либо именем пользователя, либо почтой (username ИЛИ email).
   */
  @Post('find')
  findUsers(@Body() findUsersDto: FindUsersDto): Promise<User[]> {
    const { query } = findUsersDto;
    return this.usersService.findMany({
      where: [{ username: query }, { email: query }],
    });
  }
}
