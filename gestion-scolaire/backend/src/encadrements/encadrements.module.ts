import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EncadrementsController } from './encadrements.controller';
import { EncadrementsService } from './encadrements.service';

@Module({
  imports: [PrismaModule],
  controllers: [EncadrementsController],
  providers: [EncadrementsService],
})
export class EncadrementsModule {}
