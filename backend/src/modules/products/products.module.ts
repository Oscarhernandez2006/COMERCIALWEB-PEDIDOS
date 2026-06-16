import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { SiesaModule } from '../siesa/siesa.module';
import { PriceListsModule } from '../price-lists/price-lists.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    SiesaModule,
    PriceListsModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
