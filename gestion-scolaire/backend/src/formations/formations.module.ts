import { Module } from '@nestjs/common';
import { FormationsController } from './formations.controller';
import { FilieresController } from './filieres.controller';
import { FormationsService } from './formations.service';
import { FilieresService } from './filieres.service';
import { FormationsImportService } from './formations-import.service';
import { MaquetteImportService } from './maquette-import.service';
import { DemandeDeverrouillageService } from './demande-deverrouillage.service';
import { DemandeValidationService } from './demande-validation.service';
import { AdmissionDocumentsService } from './admission-documents.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FormationsController, FilieresController],
  providers: [
    FormationsService,
    AdmissionDocumentsService,
    FilieresService,
    FormationsImportService,
    MaquetteImportService,
    DemandeDeverrouillageService,
    DemandeValidationService,
  ],
  exports: [FormationsService, FilieresService],
})
export class FormationsModule {}
