import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { ClientRecord } from '../clients/entities/client-record.entity';
import { UserCompany } from '../users/entities/user-company.entity';
import { User } from '../users/entities/user.entity';
import { BudgetsModule } from '../budgets/budgets.module';
import { ChannelSalesModule } from '../channel-sales/channel-sales.module';
import { PriceListsModule } from '../price-lists/price-lists.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, ClientRecord, UserCompany, User]),
    BudgetsModule,
    ChannelSalesModule,
    PriceListsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
