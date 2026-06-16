import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PriceListItem } from './entities/price-list-item.entity';
import { PriceListsService } from './price-lists.service';
import { PriceListsController } from './price-lists.controller';
import { PriceListsClient } from './price-lists.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([PriceListItem]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [PriceListsController],
  providers: [PriceListsService, PriceListsClient],
  exports: [PriceListsService],
})
export class PriceListsModule {}
