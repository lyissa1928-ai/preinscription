import { Module } from '@nestjs/common';
import { IotIngestController } from './iot-ingest.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [IotIngestController],
})
export class IotModule {}
