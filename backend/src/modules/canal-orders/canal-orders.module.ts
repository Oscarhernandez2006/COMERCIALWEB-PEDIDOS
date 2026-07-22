import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanalOrdersController } from './canal-orders.controller';
import { CanalOrdersService } from './canal-orders.service';
import { CanalOrder } from './entities/canal-order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CanalOrder])],
  controllers: [CanalOrdersController],
  providers: [CanalOrdersService],
  exports: [CanalOrdersService],
})
export class CanalOrdersModule {}
