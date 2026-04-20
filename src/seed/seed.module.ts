import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Car, CarSchema } from 'src/cars/entities/car.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Car.name, schema: CarSchema}
    ])
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
