import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Offer } from './entities/offer.entity';

@UseGuards(JwtAuthGuard)
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  create(
    @Body() createOfferDto: CreateOfferDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Offer> {
    return this.offersService.createOwn(createOfferDto, {
      id: user.id,
    } as User);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<Offer[]> {
    const offers = await this.offersService.findMany({
      relations: { user: true, item: true },
    });
    return offers.map((offer) => this.hideDetailsIfNeeded(offer, user.id));
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Offer> {
    const offer = await this.offersService.findOne({
      where: { id },
      relations: { user: true, item: true },
    });
    return this.hideDetailsIfNeeded(offer, user.id);
  }

  /**
   * Если заявка скрыта (hidden: true) и её запрашивает не автор заявки,
   * информация о том, кто скинулся, не показывается.
   */
  private hideDetailsIfNeeded(offer: Offer, currentUserId: number): Offer {
    if (offer.hidden && offer.user.id !== currentUserId) {
      return { ...offer, user: null } as unknown as Offer;
    }
    return offer;
  }
}
