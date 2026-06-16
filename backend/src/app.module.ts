import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SiesaModule } from './modules/siesa/siesa.module';
import { PriceListsModule } from './modules/price-lists/price-lists.module';
import { ClientsModule } from './modules/clients/clients.module';
import { AdminModule } from './modules/admin/admin.module';
import { SeederService } from './database/seeder.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    ProductsModule,
    OrdersModule,
    SiesaModule,
    PriceListsModule,
    ClientsModule,
    AdminModule,
  ],
  providers: [SeederService],
})
export class AppModule {}
