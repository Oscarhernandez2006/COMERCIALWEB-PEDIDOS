import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerLocation } from './entities/seller-location.entity';
import { Order } from '../orders/entities/order.entity';
import { CanalOrder } from '../canal-orders/entities/canal-order.entity';
import { GeoService } from './geo.service';
import { GeoController, GeoAdminController } from './geo.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SellerLocation, Order, CanalOrder]),
    UsersModule,
  ],
  controllers: [GeoController, GeoAdminController],
  providers: [GeoService],
})
export class GeoModule {}
