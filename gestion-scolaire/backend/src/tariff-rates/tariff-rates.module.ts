import { Module } from '@nestjs/common';
import { TariffRatesController } from './tariff-rates.controller';
import { TariffRatesService } from './tariff-rates.service';

@Module({
  controllers: [TariffRatesController],
  providers: [TariffRatesService],
})
export class TariffRatesModule {}
