import { IsEnum, IsNumber, IsPositive, IsString, MinLength } from 'class-validator';
import { BikeType } from '../entities/bike.entity';

export class CreateBikeDto {
  // TODO: Add @IsString() and @MinLength(2)
  @IsString()
  @MinLength(2)
  marca: string;

  // TODO: Add @IsEnum(BikeType)
  // Valid values are in the BikeType enum: mountain, road, city, electric
  @IsEnum(BikeType)
  tipo: BikeType;

  // TODO: Add @IsNumber() and @IsPositive()
  @IsNumber()
  @IsPositive()
  velocidades: number;

  // TODO: Add @IsString()
  @IsString()
  descripcion: string;
}
