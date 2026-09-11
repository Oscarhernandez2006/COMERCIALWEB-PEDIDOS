import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CanalOrdersController } from './canal-orders.controller';
import { CanalControlController } from './canal-control.controller';
import { CanalCarteraController } from './canal-cartera.controller';
import { CanalDispatchController } from './canal-dispatch.controller';
import { CanalOrdersService } from './canal-orders.service';
import { CanalOrder } from './entities/canal-order.entity';
import { OrdersErpClient } from '../orders/orders-erp.client';
import { UsersModule } from '../users/users.module';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CanalOrder]),
    HttpModule,
    ConfigModule,
    UsersModule,
    ClientsModule,
  ],
  controllers: [
    CanalOrdersController,
    CanalControlController,
    CanalCarteraController,
    CanalDispatchController,
  ],
  providers: [CanalOrdersService, OrdersErpClient],
  exports: [CanalOrdersService],
})
export class CanalOrdersModule {}
