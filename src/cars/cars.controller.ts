import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';

@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Get()
  findAll(
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('skip', ParseIntPipe) skip: number = 0,
  ) {
    return this.carsService.findAll(+limit, +skip);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.carsService.findOne(id);
  }

  @Get('search')
  searchByName(
    @Query('q') q: string = 'mcqueen',
  ) {
    return this.carsService.searchByName(q);
  }

  @Post()
  create(@Body() createCarDto: CreateCarDto) {
    return this.carsService.create(createCarDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCarDto: UpdateCarDto) {
    return this.carsService.update(id, updateCarDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.carsService.remove(id);
  }
}
