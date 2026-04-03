import { Module } from '@nestjs/common';
import { AppearanceModule } from '../appearance/appearance.module';
import { AuthModule } from '../auth/auth.module';
import { InscriptionsModule } from '../inscriptions/inscriptions.module';
import { UsersModule } from '../users/users.module';
import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';

@Module({
  imports: [AuthModule, InscriptionsModule, AppearanceModule, UsersModule],
  controllers: [PersonsController],
  providers: [PersonsService],
  exports: [PersonsService],
})
export class PersonsModule {}
