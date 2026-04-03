import { Module } from '@nestjs/common';
import { CropRequirementsController } from './crop-requirements.controller';
import { CropRequirementsService } from './crop-requirements.service';

@Module({
  controllers: [CropRequirementsController],
  providers: [CropRequirementsService],
  exports: [CropRequirementsService],
})
export class CropRequirementsModule {}
