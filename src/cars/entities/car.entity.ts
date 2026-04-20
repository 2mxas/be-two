import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Car extends Document {
  @Prop({ unique: true, index: true })
  nombre: string;

  @Prop()
  modelo: string;

  @Prop()
  anio: number;

  @Prop()
  frase: string;
}

export const CarSchema = SchemaFactory.createForClass(Car);

CarSchema.virtual('isClassic').get(function () {
  return new Date().getFullYear() - this.anio > 25;
});