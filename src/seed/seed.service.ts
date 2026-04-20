import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Car } from 'src/cars/entities/car.entity';

@Injectable()
export class SeedService {
    constructor(
        @InjectModel(Car.name)
        private readonly carModel:Model<Car>,
    ) {}
    
    async reiniciar() {
        await this.carModel.deleteMany({});

        const cars = [
        { nombre: 'Carro 1', modelo: 'Corolla', anio: 2020, frase: 'Fiable y eficiente' },
        { nombre: 'Carro 2', modelo: 'Civic', anio: 2019, frase: 'Equilibrio perfecto' },
        { nombre: 'Carro 3', modelo: 'Mustang', anio: 2021, frase: 'Potencia americana' },
        { nombre: 'Carro 4', modelo: 'Camaro', anio: 2022, frase: 'Muscle car clásico' },
        { nombre: 'Carro 5', modelo: 'M3', anio: 1995, frase: 'Leyenda alemana' },
        ];

        await this.carModel.insertMany(cars);

        return {message: 'Seed ejecutado correctamente' };
    }
}
