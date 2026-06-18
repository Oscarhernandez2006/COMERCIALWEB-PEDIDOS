import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { CarteraOrdersController } from './cartera-orders.controller';
import { OrderApprovalScheduler } from './order-approval.scheduler';
import { ClientsModule } from '../clients/clients.module';
import { ProductsModule } from '../products/products.module';
import { SiesaModule } from '../siesa/siesa.module';
import { UsersModule } from '../users/users.module';
import { PriceListsModule } from '../price-lists/price-lists.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    ClientsModule,
    ProductsModule,
    SiesaModule,
    UsersModule,
    PriceListsModule,
  ],
  controllers: [
    OrdersController,
    AdminOrdersController,
    CarteraOrdersController,
  ],
  providers: [OrdersService, OrderApprovalScheduler],
  exports: [OrdersService],
})
export class OrdersModule {}
