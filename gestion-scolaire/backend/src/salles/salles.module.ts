import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SallesController } from './salles.controller';
import { SallesService } from './salles.service';

@Module({
  imports: [AuthModule],
  controllers: [SallesController],
  providers: [SallesService],
  exports: [SallesService],
})
export class SallesModule {}
