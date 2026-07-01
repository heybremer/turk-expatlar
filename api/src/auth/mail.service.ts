import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      // Development modunda Ethereal (ücretsiz test hesabı) ya da konsola yaz
      this.logger.warn('SMTP ayarları eksik. E-posta konsola yazılacak.');
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendEmailVerification(to: string, verifyLink: string): Promise<void> {
    const fromName = process.env.SMTP_FROM_NAME ?? 'Türk Expatlar';
    const fromEmail = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@turkexpatlar.de';

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1a1a2e">E-posta Adresinizi Doğrulayın</h2>
        <p>Merhaba,</p>
        <p>Türk Expatlar'a hoş geldiniz! Hesabınızı etkinleştirmek için e-posta adresinizi doğrulayın.</p>
        <a href="${verifyLink}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
          E-postamı Doğrula
        </a>
        <p style="font-size:13px;color:#666">Bu bağlantı 24 saat geçerlidir.</p>
        <p style="font-size:13px;color:#666">Eğer bu hesabı siz oluşturmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="font-size:12px;color:#999">Türk Expatlar — Almanya Türkçe Topluluk Platformu</p>
      </div>
    `;

    const transporter = this.createTransporter();

    if (!transporter) {
      this.logger.log(`[EMAIL VERIFY] To: ${to} | Link: ${verifyLink}`);
      return;
    }

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: 'E-posta Doğrulama — Türk Expatlar',
        html,
        text: `E-posta adresinizi doğrulamak için: ${verifyLink}\n\nBağlantı 24 saat geçerlidir.`,
      });
    } catch (err) {
      this.logger.error(`Doğrulama maili gönderilemedi: ${to}`, err);
      // Kayıt akışını engelleme — mail hatası critical değil
    }
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    const fromName = process.env.SMTP_FROM_NAME ?? 'Türk Expatlar';
    const fromEmail = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@turkexpatlar.de';

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1a1a2e">Şifre Sıfırlama</h2>
        <p>Merhaba,</p>
        <p>Hesabınız için şifre sıfırlama talebinde bulundunuz. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz.</p>
        <a href="${resetLink}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
          Şifremi Sıfırla
        </a>
        <p style="font-size:13px;color:#666">Bu bağlantı 1 saat geçerlidir.</p>
        <p style="font-size:13px;color:#666">Eğer bu talebi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="font-size:12px;color:#999">Türk Expatlar — Almanya Türkçe Topluluk Platformu</p>
      </div>
    `;

    const transporter = this.createTransporter();

    if (!transporter) {
      // Development fallback: konsola yazdır
      this.logger.log(`[PASSWORD RESET] To: ${to} | Link: ${resetLink}`);
      return;
    }

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: 'Şifre Sıfırlama — Türk Expatlar',
        html,
        text: `Şifrenizi sıfırlamak için bu bağlantıya gidin: ${resetLink}\n\nBağlantı 1 saat geçerlidir.`,
      });
      this.logger.log(`Password reset e-postası gönderildi: ${to}`);
    } catch (err) {
      this.logger.error(`E-posta gönderilemedi: ${to}`, err);
      throw new Error('E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    }
  }
}
