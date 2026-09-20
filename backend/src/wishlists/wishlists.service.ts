import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { User } from '../users/entities/user.entity';
import { Wish } from '../wishes/entities/wish.entity';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async create(
    createWishlistDto: CreateWishlistDto,
    owner: User,
    items: Wish[],
  ): Promise<Wishlist> {
    const wishlist = this.wishlistRepository.create({
      name: createWishlistDto.name,
      description: createWishlistDto.description,
      image: createWishlistDto.image,
      owner,
      items,
    });
    return this.wishlistRepository.save(wishlist);
  }

  async findMany(query: FindManyOptions<Wishlist>): Promise<Wishlist[]> {
    return this.wishlistRepository.find(query);
  }

  async findOne(query: FindOneOptions<Wishlist>): Promise<Wishlist> {
    const wishlist = await this.wishlistRepository.findOne(query);
    if (!wishlist) {
      throw new NotFoundException('Список подарков не найден');
    }
    return wishlist;
  }

  async updateOne(
    query: FindOptionsWhere<Wishlist>,
    updateWishlistDto: UpdateWishlistDto,
    items?: Wish[],
  ): Promise<Wishlist> {
    const wishlist = await this.findOne({
      where: query,
      relations: { items: true },
    });

    if (updateWishlistDto.name !== undefined) {
      wishlist.name = updateWishlistDto.name;
    }
    if (updateWishlistDto.description !== undefined) {
      wishlist.description = updateWishlistDto.description;
    }
    if (updateWishlistDto.image !== undefined) {
      wishlist.image = updateWishlistDto.image;
    }
    if (items) {
      wishlist.items = items;
    }

    return this.wishlistRepository.save(wishlist);
  }

  async removeOne(query: FindOptionsWhere<Wishlist>): Promise<Wishlist> {
    const wishlist = await this.findOne({ where: query });
    return this.wishlistRepository.remove(wishlist);
  }

  /**
   * Редактирование списка подарков с проверкой, что редактирует владелец.
   * Реальное сохранение делегируется базовому updateOne.
   */
  async updateOwn(
    id: number,
    ownerId: number,
    updateWishlistDto: UpdateWishlistDto,
    items?: Wish[],
  ): Promise<Wishlist> {
    const wishlist = await this.findOne({
      where: { id },
      relations: { owner: true },
    });

    if (wishlist.owner.id !== ownerId) {
      throw new ForbiddenException(
        'Нельзя редактировать чужой список подарков',
      );
    }

    return this.updateOne({ id }, updateWishlistDto, items);
  }

  /**
   * Удаление списка подарков с проверкой, что удаляет владелец.
   */
  async removeOwn(id: number, ownerId: number): Promise<Wishlist> {
    const wishlist = await this.findOne({
      where: { id },
      relations: { owner: true },
    });

    if (wishlist.owner.id !== ownerId) {
      throw new ForbiddenException('Нельзя удалить чужой список подарков');
    }

    return this.removeOne({ id });
  }
}
