import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { SiesaModule } from '../siesa/siesa.module';

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), SiesaModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
