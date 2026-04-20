import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Document } from 'mongoose';

@Schema()
export class Pilot extends Document {
  @Prop()
  nombre: string;

  @Prop()
  escuderia: string;

  @Prop({ unique: true, index: true })
  numero?: number;

  @Prop()
  activo: boolean;

  @Prop()
  campeonatos?: number;
}

export const PilotSchema = SchemaFactory.createForClass(Pilot);