import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SiesaClient } from './siesa.client';
import { SiesaService } from './siesa.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [SiesaClient, SiesaService],
  exports: [SiesaService],
})
export class SiesaModule {}
