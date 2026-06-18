import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from './entities/quote.entity';
import { QuoteItem } from './entities/quote-item.entity';
import { Product } from '../products/entities/product.entity';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { ClientsModule } from '../clients/clients.module';
import { PriceListsModule } from '../price-lists/price-lists.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote, QuoteItem, Product]),
    ClientsModule,
    PriceListsModule,
    UsersModule,
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
