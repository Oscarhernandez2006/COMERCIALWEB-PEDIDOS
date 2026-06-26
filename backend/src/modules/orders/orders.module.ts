import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CarteraOrdersController } from './cartera-orders.controller';
import { OrderApprovalScheduler } from './order-approval.scheduler';
import { OrdersErpClient } from './orders-erp.client';
import { ClientsModule } from '../clients/clients.module';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';
import { PriceListsModule } from '../price-lists/price-lists.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    HttpModule,
    ConfigModule,
    ClientsModule,
    ProductsModule,
    UsersModule,
    PriceListsModule,
    SettingsModule,
  ],
  controllers: [OrdersController, CarteraOrdersController],
  providers: [OrdersService, OrderApprovalScheduler, OrdersErpClient],
  exports: [OrdersService],
})
export class OrdersModule {}
