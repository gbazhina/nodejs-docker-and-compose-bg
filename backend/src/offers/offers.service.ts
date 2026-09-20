import {
  BadRequestException,
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
import { Offer } from './entities/offer.entity';
import { User } from '../users/entities/user.entity';
import { Wish } from '../wishes/entities/wish.entity';
import { WishesService } from '../wishes/wishes.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    private readonly wishesService: WishesService,
  ) {}

  async create(
    createOfferDto: CreateOfferDto,
    user: User,
    item: Wish,
  ): Promise<Offer> {
    const offer = this.offerRepository.create({
      amount: createOfferDto.amount,
      hidden: createOfferDto.hidden,
      user,
      item,
    });
    return this.offerRepository.save(offer);
  }

  async findMany(query: FindManyOptions<Offer>): Promise<Offer[]> {
    return this.offerRepository.find(query);
  }

  async findOne(query: FindOneOptions<Offer>): Promise<Offer> {
    const offer = await this.offerRepository.findOne(query);
    if (!offer) {
      throw new NotFoundException('Заявка на скидывание не найдена');
    }
    return offer;
  }

  async updateOne(
    query: FindOptionsWhere<Offer>,
    updateOfferDto: UpdateOfferDto,
  ): Promise<Offer> {
    const offer = await this.findOne({ where: query });
    Object.assign(offer, updateOfferDto);
    return this.offerRepository.save(offer);
  }

  async removeOne(query: FindOptionsWhere<Offer>): Promise<Offer> {
    const offer = await this.findOne({ where: query });
    return this.offerRepository.remove(offer);
  }

  /**
   * Создание заявки «скинуться» с бизнес-проверками:
   * - нельзя вносить деньги на собственный подарок;
   * - нельзя скидываться на подарок, сбор на который уже завершён;
   * - сумма всех заявок не может превышать стоимость подарка.
   * Редактирование и удаление заявок сознательно не реализуются —
   * «передумать тут нельзя» — эти методы не выставляются наружу контроллером.
   */
  async createOwn(createOfferDto: CreateOfferDto, user: User): Promise<Offer> {
    const wish = await this.wishesService.findOne({
      where: { id: createOfferDto.itemId },
      relations: { owner: true },
    });

    if (wish.owner.id === user.id) {
      throw new ForbiddenException(
        'Нельзя вносить деньги на собственный подарок',
      );
    }

    const price = Number(wish.price);
    const raised = Number(wish.raised);
    const amount = Number(createOfferDto.amount);

    if (raised >= price) {
      throw new BadRequestException(
        'Сбор средств на этот подарок уже завершён',
      );
    }

    if (raised + amount > price) {
      throw new BadRequestException(
        'Сумма заявки превышает оставшуюся стоимость подарка',
      );
    }

    const offer = await this.create(createOfferDto, user, wish);
    await this.wishesService.increaseRaised(wish.id, amount);

    return offer;
  }
}
