import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ChannelSale } from './entities/channel-sale.entity';
import { ChannelSalesClient } from './channel-sales.client';
import { ChannelSalesService } from './channel-sales.service';
import { ChannelSalesController } from './channel-sales.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChannelSale]), HttpModule],
  controllers: [ChannelSalesController],
  providers: [ChannelSalesClient, ChannelSalesService],
  exports: [ChannelSalesClient, ChannelSalesService],
})
export class ChannelSalesModule {}
