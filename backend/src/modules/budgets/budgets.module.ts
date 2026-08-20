import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { Budget } from './entities/budget.entity';
import { ClientBudget } from './entities/client-budget.entity';
import { Projection } from './entities/projection.entity';
import { UserCompany } from '../users/entities/user-company.entity';
import { UsersModule } from '../users/users.module';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Budget, ClientBudget, Projection, UserCompany]),
    UsersModule,
    ClientsModule,
  ],
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
