import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StudentsService } from './students.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('students/me')
@UseGuards(AuthGuard('jwt'))
export class StudentsController {
  constructor(private service: StudentsService) {}

  @Get('proforma-invoice')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="facture-proforma.pdf"')
  async getProformaInvoice(
    @CurrentUser() user: { sub: string },
    @Query('anneeUniv') anneeUniv?: string,
  ): Promise<StreamableFile> {
    const pdf = await this.service.getProformaInvoice(
      user.sub,
      anneeUniv ? +anneeUniv : undefined,
    );
    return new StreamableFile(pdf);
  }

  @Get('certificate')
  @Header('Content-Type', 'application/pdf')
  @Header(
    'Content-Disposition',
    'attachment; filename="certificat-scolarite.pdf"',
  )
  async getCertificate(
    @CurrentUser() user: { sub: string },
    @Query('anneeUniv') anneeUniv?: string,
  ): Promise<StreamableFile> {
    const pdf = await this.service.getCertificate(
      user.sub,
      anneeUniv ? +anneeUniv : undefined,
    );
    return new StreamableFile(pdf);
  }

  @Get('statut-financier')
  getStatutFinancier(
    @CurrentUser() user: { sub: string },
    @Query('anneeUniv') anneeUniv?: string,
  ) {
    return this.service.getStatutFinancier(
      user.sub,
      anneeUniv ? +anneeUniv : undefined,
    );
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: { sub: string }) {
    return this.service.getStudentDashboard(user.sub);
  }

  @Get('fiche-inscription')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="fiche-inscription.pdf"')
  async getFicheInscription(
    @CurrentUser() user: { sub: string },
  ): Promise<StreamableFile> {
    const pdf = await this.service.getMyFicheInscriptionPdf(user.sub);
    return new StreamableFile(pdf);
  }

  @Get('receipts')
  getReceipts(@CurrentUser() user: { sub: string }) {
    return this.service.getReceipts(user.sub);
  }

  @Get('receipts/:id')
  @Header('Content-Type', 'application/pdf')
  async getReceiptPdf(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    const pdf = await this.service.getReceiptPdf(user.sub, id);
    return new StreamableFile(pdf, {
      disposition: `attachment; filename="recu-${id.slice(-8)}.pdf"`,
    });
  }
}
