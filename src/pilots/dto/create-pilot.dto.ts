import { IsNumber, IsPositive, IsString, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreatePilotDto {
  @IsString()
  nombre: string;

  @IsString()
  escuderia: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  numero?: number;

  @IsBoolean()
  activo: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  campeonatos?: number;
}