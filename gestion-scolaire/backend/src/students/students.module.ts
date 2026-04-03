import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { FinanceModule } from '../finance/finance.module';
import { PersonsModule } from '../persons/persons.module';

@Module({
  imports: [FinanceModule, PersonsModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
