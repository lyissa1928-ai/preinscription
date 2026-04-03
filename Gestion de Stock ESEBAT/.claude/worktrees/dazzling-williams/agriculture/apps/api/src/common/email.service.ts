import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port ?? 587,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM', 'noreply@agriculture.sn');
    const subject = 'Réinitialisation de votre mot de passe - Agriculture Intelligente';
    const html = `
      <p>Bonjour,</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
      <p><a href="${resetLink}" style="color: #16a34a;">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien expire dans 1 heure.</p>
      <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      <p>— Équipe Agriculture Intelligente</p>
    `;

    if (this.transporter) {
      await this.transporter.sendMail({
        from,
        to: email,
        subject,
        html,
      });
    } else {
      // Dev: log pour faciliter les tests
      console.log('[EmailService] SMTP non configuré. Lien de reset:', resetLink);
    }
  }
}
