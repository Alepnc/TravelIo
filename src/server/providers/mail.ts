import "server-only";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface MailProvider {
  send(message: MailMessage): Promise<void>;
}

/**
 * In sviluppo le email vengono scritte nel log del server.
 * In produzione collegare un provider (Resend, Postmark, SES) tramite MAIL_PROVIDER.
 */
class ConsoleMailer implements MailProvider {
  async send(message: MailMessage) {
    console.info(`\n📧 [email di sviluppo] a: ${message.to}\n   oggetto: ${message.subject}\n   ${message.text.replace(/\n/g, "\n   ")}\n`);
  }
}

export const mailer: MailProvider = new ConsoleMailer();
