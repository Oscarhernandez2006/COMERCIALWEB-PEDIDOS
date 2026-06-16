import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserCompany } from './entities/user-company.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserCompany])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
