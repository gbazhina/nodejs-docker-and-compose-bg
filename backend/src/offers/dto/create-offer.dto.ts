import { IsBoolean, IsInt, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateOfferDto {
  @IsInt()
  itemId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;
}
