import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WishesService } from './wishes.service';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Wish } from './entities/wish.entity';

@Controller('wishes')
export class WishesController {
  constructor(private readonly wishesService: WishesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createWishDto: CreateWishDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Wish> {
    return this.wishesService.create(createWishDto, { id: user.id } as User);
  }

  /** Последние добавленные подарки — публичный маршрут, без авторизации */
  @Get('last')
  findLast(): Promise<Wish[]> {
    return this.wishesService.findMany({
      order: { createdAt: 'DESC' },
      take: 40,
      relations: { owner: true },
    });
  }

  /**
   * Самые популярные (часто копируемые) подарки —
   * публичный маршрут, без авторизации
   */
  @Get('top')
  findTop(): Promise<Wish[]> {
    return this.wishesService.findMany({
      order: { copied: 'DESC' },
      take: 20,
      relations: { owner: true },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Wish> {
    const wish = await this.wishesService.findOne({
      where: { id },
      relations: { owner: true, offers: { user: true } },
    });

    // Фронтенд ожидает у каждого offer плоское поле `name` — имя того,
    // кто скинулся. Если заявка скрыта (hidden) и смотрит не автор
    // заявки, ни имя, ни сам вложенный объект user не показываем —
    // та же логика, что и в OffersController.hideDetailsIfNeeded.
    const offers = (wish.offers ?? []).map((offer) => {
      const shouldHide = offer.hidden && offer.user?.id !== user.id;
      return {
        ...offer,
        user: shouldHide ? null : offer.user,
        name: shouldHide ? null : (offer.user?.username ?? null),
      };
    });

    return { ...wish, offers } as unknown as Wish;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateWishDto: UpdateWishDto,
  ): Promise<Wish> {
    return this.wishesService.updateOwn(id, user.id, updateWishDto);
  }

  /** Скопировать чужой подарок себе в список желаний */
  @UseGuards(JwtAuthGuard)
  @Post(':id/copy')
  copyWish(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Wish> {
    return this.wishesService.copyWish(id, { id: user.id } as User);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Wish> {
    return this.wishesService.removeOwn(id, user.id);
  }
}
