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
import { Wish } from './entities/wish.entity';
import { User } from '../users/entities/user.entity';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';

@Injectable()
export class WishesService {
  constructor(
    @InjectRepository(Wish)
    private readonly wishRepository: Repository<Wish>,
  ) {}

  async create(createWishDto: CreateWishDto, owner: User): Promise<Wish> {
    const wish = this.wishRepository.create({
      ...createWishDto,
      raised: 0,
      copied: 0,
      owner,
    });
    return this.wishRepository.save(wish);
  }

  async findMany(query: FindManyOptions<Wish>): Promise<Wish[]> {
    return this.wishRepository.find(query);
  }

  async findOne(query: FindOneOptions<Wish>): Promise<Wish> {
    const wish = await this.wishRepository.findOne(query);
    if (!wish) {
      throw new NotFoundException('Подарок не найден');
    }
    return wish;
  }

  async updateOne(
    query: FindOptionsWhere<Wish>,
    updateWishDto: UpdateWishDto,
  ): Promise<Wish> {
    const wish = await this.findOne({ where: query });
    Object.assign(wish, updateWishDto);
    return this.wishRepository.save(wish);
  }

  async removeOne(query: FindOptionsWhere<Wish>): Promise<Wish> {
    const wish = await this.findOne({ where: query });
    return this.wishRepository.remove(wish);
  }

  /**
   * Редактирование подарка с бизнес-проверками:
   * - редактировать может только владелец;
   * - нельзя менять цену, если уже есть желающие скинуться (offers.length > 0);
   * - поле raised в UpdateWishDto отсутствует в принципе — сумма сбора
   *   всегда считается из заявок (offers) и не может быть выставлена вручную.
   * Реальное сохранение делегируется базовому updateOne — сама проверка
   * никак не меняет базовый CRUD-метод.
   */
  async updateOwn(
    id: number,
    ownerId: number,
    updateWishDto: UpdateWishDto,
  ): Promise<Wish> {
    const wish = await this.findOne({
      where: { id },
      relations: { owner: true, offers: true },
    });

    if (wish.owner.id !== ownerId) {
      throw new ForbiddenException('Нельзя редактировать чужой подарок');
    }

    if (updateWishDto.price !== undefined && wish.offers.length > 0) {
      throw new ForbiddenException(
        'Нельзя менять стоимость подарка, если уже есть желающие скинуться',
      );
    }

    return this.updateOne({ id }, updateWishDto);
  }

  /**
   * Удаление подарка с проверкой, что удаляет его владелец.
   */
  async removeOwn(id: number, ownerId: number): Promise<Wish> {
    const wish = await this.findOne({
      where: { id },
      relations: { owner: true },
    });

    if (wish.owner.id !== ownerId) {
      throw new ForbiddenException('Нельзя удалить чужой подарок');
    }

    return this.removeOne({ id });
  }

  /**
   * Увеличивает сумму сбора (raised) на подарке.
   * Вызывается только сервером после успешного создания заявки (offer) —
   * поле raised намеренно отсутствует в UpdateWishDto, чтобы пользователь
   * не мог выставить его напрямую через API.
   */
  async increaseRaised(id: number, amount: number): Promise<Wish> {
    const wish = await this.findOne({ where: { id } });
    wish.raised = Number(wish.raised) + Number(amount);
    return this.wishRepository.save(wish);
  }

  /**
   * Увеличивает счётчик копирований (copied) на оригинальном подарке.
   */
  async increaseCopied(id: number): Promise<Wish> {
    const wish = await this.findOne({ where: { id } });
    wish.copied = Number(wish.copied) + 1;
    return this.wishRepository.save(wish);
  }

  /**
   * Копирует чужой (или свой) подарок себе в список желаний:
   * создаёт новую запись Wish с теми же данными, но с новым владельцем
   * и обнулённым сбором, а у оригинала увеличивает счётчик copied.
   */
  async copyWish(id: number, owner: User): Promise<Wish> {
    const original = await this.findOne({ where: { id } });

    const copy = this.wishRepository.create({
      name: original.name,
      link: original.link,
      image: original.image,
      price: original.price,
      description: original.description,
      raised: 0,
      copied: 0,
      owner,
    });
    const saved = await this.wishRepository.save(copy);

    await this.increaseCopied(id);

    return saved;
  }
}
