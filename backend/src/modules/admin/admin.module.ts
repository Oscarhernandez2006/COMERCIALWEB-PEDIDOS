import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { PriceListItem } from '../price-lists/entities/price-list-item.entity';
import { UsersModule } from '../users/users.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { ChannelSalesModule } from '../channel-sales/channel-sales.module';
import { PriceListsModule } from '../price-lists/price-lists.module';
import { AdminStatsService } from './admin-stats.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminReportsController } from './admin-reports.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrdersController } from './admin-orders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Customer, Product, PriceListItem]),
    UsersModule,
    BudgetsModule,
    ChannelSalesModule,
    PriceListsModule,
  ],
  controllers: [
    AdminStatsController,
    AdminUsersController,
    AdminReportsController,
    AdminOrdersController,
  ],
  providers: [AdminStatsService, AdminReportsService, AdminOrdersService],
})
export class AdminModule {}
