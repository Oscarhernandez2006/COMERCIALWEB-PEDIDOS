import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DispatchTatInvoice } from './entities/dispatch-tat-invoice.entity';
import { DispatchController } from './dispatch.controller';
import { DispatchPublicController } from './dispatch-public.controller';
import { DispatchService } from './dispatch.service';
import { DispatchClient } from './dispatch.client';
import { DispatchApiKeyGuard } from './dispatch-api-key.guard';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([DispatchTatInvoice])],
  controllers: [DispatchController, DispatchPublicController],
  providers: [DispatchService, DispatchClient, DispatchApiKeyGuard],
  exports: [DispatchService],
})
export class DispatchModule {}
