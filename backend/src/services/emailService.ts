import axios from 'axios';
import { MagicTokenService } from './magicTokenService';

export interface EmailMessage {
  id: string;
  to: string;
  recipient_name: string;
  subject: string;
  template_type: 'RETENTION_MAGIC_LINK' | 'PAYMENT_RECEIPT';
  body_text: string;
  body_html: string;
  magic_link_url?: string;
  magic_token?: string;
  sent_at: string;
  delivery_status?: 'SENT_VIA_MAILJET' | 'STORED_IN_OUTBOX' | 'FAILED';
  mailjet_message_id?: string;
}

// In-Memory Outbox for Demo & Log Inspection
export const emailOutbox: EmailMessage[] = [
  {
    id: 'eml-init-01',
    to: 'dina.kusuma@example.com',
    recipient_name: 'Dina Kusuma',
    subject: 'FitBody Gym: Ada kendala dengan jadwal latihanmu, Dina?',
    template_type: 'RETENTION_MAGIC_LINK',
    magic_token: 'tkn_dina_88a9f4c2',
    magic_link_url: '/member?token=tkn_dina_88a9f4c2',
    body_text: 'Halo Dina, kami melihat kamu jarang hadir belakangan ini. Buka solusi instan sekali klik tanpa login: /member?token=tkn_dina_88a9f4c2',
    body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">FitBody Gym & Studio</h2>
        <p>Halo <strong>Dina Kusuma</strong>,</p>
        <p>Kami perhatikan kamu baru menggunakan 2 dari 8 sesi bulan ini. Apakah jadwal latihan pagimu bentrok dengan agenda kantor?</p>
        <p>Pilih solusi cerdas sekali klik tanpa repot mengetik atau menelepon CS:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="/member?token=tkn_dina_88a9f4c2" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Pilih Solusi Jadwal Saya
          </a>
        </div>
        <p style="font-size: 12px; color: #64748b;">Tautan ini dibuat khusus dan unik untuk Dina Kusuma (Aman & Tanpa Password).</p>
      </div>
    `,
    sent_at: new Date().toISOString(),
    delivery_status: 'STORED_IN_OUTBOX',
  }
];

export class EmailService {
  /**
   * Helper internal untuk mengirim email via Mailjet REST API v3.1
   */
  private static async dispatchMailjetEmail(payload: {
    toEmail: string;
    toName: string;
    subject: string;
    textPart: string;
    htmlPart: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = process.env.MAILJET_API_KEY;
    const secretKey = process.env.MAILJET_SECRET_KEY;
    const senderEmail = process.env.MAILJET_SENDER_EMAIL || 'support@lanjut.id';
    const senderName = process.env.MAILJET_SENDER_NAME || 'FitBody Gym Care';

    if (!apiKey || !secretKey || apiKey === 'your_mailjet_api_key_here') {
      console.log('ℹ️ [EmailService] Mailjet API Key / Secret Key belum diatur di .env. Email disimpan di outbox internal.');
      return { success: false, error: 'MAILJET_KEYS_NOT_CONFIGURED' };
    }

    try {
      const authHeader = `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString('base64')}`;
      const response = await axios.post(
        'https://api.mailjet.com/v3.1/send',
        {
          Messages: [
            {
              From: {
                Email: senderEmail,
                Name: senderName,
              },
              To: [
                {
                  Email: payload.toEmail,
                  Name: payload.toName,
                },
              ],
              Subject: payload.subject,
              TextPart: payload.textPart,
              HTMLPart: payload.htmlPart,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          timeout: 10000,
        }
      );

      const messageId = response.data?.Messages?.[0]?.To?.[0]?.MessageID;
      console.log(`✅ [EmailService] Mailjet Terkirim Sukses ke ${payload.toEmail}! MessageID: ${messageId}`);
      return { success: true, messageId: String(messageId || 'SENT') };
    } catch (err: any) {
      console.error('⚠️ [EmailService] Mailjet API Error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data?.ErrorMessage || err.message };
    }
  }

  /**
   * Mengirim email retention invite dengan Magic Link unik bertoken kriptografis
   */
  static async sendRetentionInvite(params: {
    to: string;
    recipient_name: string;
    member_id: string;
    merchant_name?: string;
    baseUrl?: string;
  }): Promise<EmailMessage> {
    const merchantName = params.merchant_name || 'FitBody Gym & Studio';
    const baseUrl = params.baseUrl || '';
    
    // Generate Token Kriptografis Unik untuk Member Ini
    const token = MagicTokenService.generateToken(params.member_id);
    const magicLink = `${baseUrl}/member?token=${token}`;

    const subject = `${merchantName}: Ada kendala dengan jadwal latihanmu, ${params.recipient_name.split(' ')[0]}?`;
    const textPart = `Halo ${params.recipient_name}, kami melihat kehadiranmu berkurang belakangan ini. Pilih solusi cepat sekali klik tanpa login: ${magicLink}`;
    const htmlPart = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
        <div style="border-bottom: 2px solid #005E6A; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 20px;">${merchantName}</h2>
          <span style="font-size: 12px; color: #64748b; font-weight: 500;">Solusi Keanggotaan Member Otomatis</span>
        </div>
        <p style="font-size: 15px; color: #1e293b;">Halo <strong>${params.recipient_name}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Kami melihat kamu baru menggunakan 2 dari 8 sesi bulan ini. Kami paham agenda kantor seringkali bentrok di jam pagi.
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Sistem kami telah menyiapkan <strong>Smart Options</strong> berdasarkan kuota kosong studio secara real-time. Kamu cukup memilih dengan <strong>1 kali klik</strong> tanpa perlu login atau mengetik:
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${magicLink}" style="background-color: #005E6A; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(0, 94, 106, 0.25);">
            Pilih Solusi Sekali Klik &rarr;
          </a>
        </div>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #64748b; border: 1px dashed #cbd5e1;">
          🔒 <strong>Tautan Unik Kriptografis:</strong> Tautan ini hanya berlaku untuk ${params.recipient_name} dan aktif selama 7 hari tanpa memerlukan kata sandi.
        </div>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">
          Dikirim otomatis oleh LANJUT Autonomous Retention & BNI Intelligence Engine.
        </p>
      </div>
    `;

    // Kirim via Mailjet
    const mailjetResult = await this.dispatchMailjetEmail({
      toEmail: params.to,
      toName: params.recipient_name,
      subject,
      textPart,
      htmlPart,
    });

    const newEmail: EmailMessage = {
      id: `eml-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      to: params.to,
      recipient_name: params.recipient_name,
      subject,
      template_type: 'RETENTION_MAGIC_LINK',
      magic_token: token,
      magic_link_url: magicLink,
      body_text: textPart,
      body_html: htmlPart,
      sent_at: new Date().toISOString(),
      delivery_status: mailjetResult.success ? 'SENT_VIA_MAILJET' : 'STORED_IN_OUTBOX',
      mailjet_message_id: mailjetResult.messageId,
    };

    emailOutbox.unshift(newEmail);
    return newEmail;
  }

  /**
   * Mengirim email tanda terima pembayaran BNI Virtual Account
   */
  static async sendPaymentReceipt(params: {
    to: string;
    recipient_name: string;
    session_name: string;
    amount: number;
    va_number: string;
    merchant_name?: string;
  }): Promise<EmailMessage> {
    const merchantName = params.merchant_name || 'FitBody Gym & Studio';
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(params.amount);

    const subject = `[LUNAS] Bukti Pembayaran BNI VA - ${params.session_name}`;
    const textPart = `Pembayaran ${formattedAmount} via BNI VA (${params.va_number}) untuk ${params.session_name} di ${merchantName} berhasil diverifikasi. Membership aktif!`;
    const htmlPart = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; background: #dcfce7; color: #16a34a; padding: 8px 16px; border-radius: 9999px; font-weight: 600; font-size: 14px;">
            ✓ Pembayaran Berhasil Terverifikasi
          </div>
          <h2 style="color: #0f172a; margin-top: 12px;">Bukti Transaksi Resmi BNI VA</h2>
          <p style="color: #64748b; font-size: 13px;">${merchantName}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Member</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0f172a;">${params.recipient_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Opsi Solusi Baru</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0f172a;">${params.session_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Metode Pembayaran</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0f172a;">BNI Virtual Account (${params.va_number})</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Total Terbayar</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #16a34a; font-size: 16px;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Status Member</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #2563eb;">TERSELAMATKAN & AKTIF</td>
          </tr>
        </table>
        <div style="background: #f8fafc; border-radius: 8px; padding: 12px; font-size: 12px; color: #475569; text-align: center;">
          Sampai jumpa di kelas studio! Tunjukkan bukti email ini ke resepsionis saat hadir.
        </div>
      </div>
    `;

    // Kirim via Mailjet
    const mailjetResult = await this.dispatchMailjetEmail({
      toEmail: params.to,
      toName: params.recipient_name,
      subject,
      textPart,
      htmlPart,
    });

    const newEmail: EmailMessage = {
      id: `eml-rcpt-${Date.now()}`,
      to: params.to,
      recipient_name: params.recipient_name,
      subject,
      template_type: 'PAYMENT_RECEIPT',
      body_text: textPart,
      body_html: htmlPart,
      sent_at: new Date().toISOString(),
      delivery_status: mailjetResult.success ? 'SENT_VIA_MAILJET' : 'STORED_IN_OUTBOX',
      mailjet_message_id: mailjetResult.messageId,
    };

    emailOutbox.unshift(newEmail);
    return newEmail;
  }

  static getOutbox(): EmailMessage[] {
    return emailOutbox;
  }
}
