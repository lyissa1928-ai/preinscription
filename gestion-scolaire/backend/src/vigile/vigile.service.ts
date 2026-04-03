import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class VigileService {
  constructor(
    private prisma: PrismaService,
    private finance: FinanceService,
    private audit: AuditService,
  ) {}

  async checkIn(
    matricule: string,
    ip?: string,
  ): Promise<{ authorized: boolean; message: string; nom?: string }> {
    const trimmed = matricule?.trim();
    if (!trimmed) {
      return { authorized: false, message: 'Matricule requis' };
    }

    const person = await this.prisma.person.findUnique({
      where: { matricule: trimmed },
      include: { user: true },
    });

    if (!person) {
      await this.logCheckIn(trimmed, false, 'Étudiant non trouvé');
      await this.audit.log({
        action: 'VIGILE_CHECKIN',
        entityType: 'CheckIn',
        entityId: trimmed,
        newValue: 'REFUSE',
        ip,
      });
      return { authorized: false, message: 'Étudiant non trouvé' };
    }

    if (person.type !== 'STUDENT') {
      await this.logCheckIn(trimmed, false, 'Contrôle réservé aux étudiants');
      await this.audit.log({
        action: 'VIGILE_CHECKIN',
        entityType: 'CheckIn',
        entityId: trimmed,
        newValue: 'REFUSE',
        ip,
      });
      return { authorized: false, message: 'Contrôle réservé aux étudiants' };
    }

    const anneeUniv =
      new Date().getMonth() >= 8
        ? new Date().getFullYear()
        : new Date().getFullYear() - 1;
    const statut = await this.finance.getStatutFinancier(person.id, anneeUniv);

    if (!statut.enRegle) {
      await this.logCheckIn(trimmed, false, 'Étudiant non en règle');
      await this.audit.log({
        action: 'VIGILE_CHECKIN',
        entityType: 'CheckIn',
        entityId: trimmed,
        newValue: 'REFUSE',
        ip,
      });
      return { authorized: false, message: 'Étudiant non en règle' };
    }

    const nom = person.user
      ? `${person.user.firstName} ${person.user.lastName}`
      : person.matricule;
    await this.logCheckIn(trimmed, true, null);
    await this.audit.log({
      action: 'VIGILE_CHECKIN',
      entityType: 'CheckIn',
      entityId: trimmed,
      newValue: 'AUTORISE',
      ip,
    });
    return { authorized: true, message: 'Autorisé', nom };
  }

  private async logCheckIn(
    matricule: string,
    autorise: boolean,
    message: string | null,
  ) {
    await this.prisma.checkInLog.create({
      data: { matricule, autorise, message },
    });
  }
}
