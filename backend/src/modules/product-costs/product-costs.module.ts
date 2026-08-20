import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductCost } from './entities/product-cost.entity';
import { ProductCostsService } from './product-costs.service';
import { ProductCostsController } from './product-costs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductCost])],
  controllers: [ProductCostsController],
  providers: [ProductCostsService],
  exports: [ProductCostsService],
})
export class ProductCostsModule {}
