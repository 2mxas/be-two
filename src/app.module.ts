import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CarsModule } from './cars/cars.module';
import { BikesModule } from './bikes/bikes.module';
import { PilotsModule } from './pilots/pilots.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    // Loads environment variables from the .env file
    ConfigModule.forRoot({ isGlobal: true }),

    // MongoDB connection
    // The URL is read from the .env file (MONGODB_URL variable)
    // Falls back to local MongoDB if the variable is not set
    //
    // Option A — Docker:  MONGODB_URL=mongodb://localhost:27017/nest-cars
    // Option B — Atlas:   MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/nest-cars
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URL'),
      }),
      inject: [ConfigService]
    }),

    CarsModule,
    BikesModule,
    PilotsModule,
    SeedModule,
  ],
})
export class AppModule {}
