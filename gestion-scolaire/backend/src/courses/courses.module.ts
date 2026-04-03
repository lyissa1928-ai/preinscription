import { Module } from '@nestjs/common';
import { AppearanceModule } from '../appearance/appearance.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { EdtExportService } from './edt-export.service';
import { SeancesService } from './seances.service';

@Module({
  imports: [AppearanceModule],
  controllers: [CoursesController],
  providers: [CoursesService, SeancesService, EdtExportService],
  exports: [CoursesService, SeancesService],
})
export class CoursesModule {}
