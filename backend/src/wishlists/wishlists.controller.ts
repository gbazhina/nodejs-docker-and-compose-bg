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
import { In } from 'typeorm';
import { WishlistsService } from './wishlists.service';
import { WishesService } from '../wishes/wishes.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Wish } from '../wishes/entities/wish.entity';
import { Wishlist } from './entities/wishlist.entity';

@UseGuards(JwtAuthGuard)
@Controller(['wishlists', 'wishlistlists'])
export class WishlistsController {
  constructor(
    private readonly wishlistsService: WishlistsService,
    private readonly wishesService: WishesService,
  ) {}

  @Post()
  async create(
    @Body() createWishlistDto: CreateWishlistDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Wishlist> {
    const items = await this.wishesService.findMany({
      where: { id: In(createWishlistDto.itemsId) },
    });
    return this.wishlistsService.create(
      createWishlistDto,
      { id: user.id } as User,
      items,
    );
  }

  @Get()
  findAll(): Promise<Wishlist[]> {
    return this.wishlistsService.findMany({
      relations: { owner: true, items: true },
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Wishlist> {
    return this.wishlistsService.findOne({
      where: { id },
      relations: { owner: true, items: true },
    });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateWishlistDto: UpdateWishlistDto,
  ): Promise<Wishlist> {
    let items: Wish[] | undefined;
    if (updateWishlistDto.itemsId) {
      items = await this.wishesService.findMany({
        where: { id: In(updateWishlistDto.itemsId) },
      });
    }
    return this.wishlistsService.updateOwn(
      id,
      user.id,
      updateWishlistDto,
      items,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Wishlist> {
    return this.wishlistsService.removeOwn(id, user.id);
  }
}
