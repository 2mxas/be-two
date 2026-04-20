import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Car } from './entities/car.entity';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';

@Injectable()
export class CarsService {
  private readonly logger = new Logger('Cars');

  constructor(
    @InjectModel(Car.name)
    private readonly carsModel: Model<Car>,
  ) {}

  async findAll(limit: number, skip: number) {
    return this.carsModel.find().limit(limit).skip(skip);
  }

  async findOne(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Id is not a valid object id`);
    }

    const car = await this.carsModel.findById(id);

    if (!car) {
      throw new NotFoundException(`Car with id ${id} not found`);
    }

    return car;
  }

  async searchByName(q: string) {
    return this.carsModel.find({ nombre: { $regex: q, $options: 'i' } });
  }

  async create(createCarDto: CreateCarDto) {
    createCarDto.nombre = createCarDto.nombre.toLowerCase();

    try {
      const car = await this.carsModel.create(createCarDto);
      return car;
    } catch (error) {
      this.handleException(error);
    }
  }

  async update(id: string, updateCarDto: UpdateCarDto) {
    if (updateCarDto.nombre) {
      updateCarDto.nombre = updateCarDto.nombre.toLowerCase();
    }

    const car = await this.findOne(id);

    try {
      await car.updateOne(updateCarDto);
      return { ...car.toJSON(), ...updateCarDto };
    } catch (error) {
      this.handleException(error);
    }
  }

  async remove(id: string) {
    const { deletedCount } = await this.carsModel.deleteOne({ _id: id });

    if (deletedCount === 0) {
      throw new BadRequestException(`Car with id ${id} not found`);
    }

    return;
  }

  private handleException(error: any) {
    if (error.code === 11000) {
      throw new BadRequestException(
        `Car exists in db ${JSON.stringify(error.keyValue)}`,
      );
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      `Can't process request, check server logs`,
    );
  }
}
