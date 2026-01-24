/**
 * Email Service
 *
 * Handles email sending via nodemailer.
 * Supports SMTP configuration and HTML templates.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 1025),
      secure: this.configService.get('SMTP_SECURE', 'false') === 'true',
      auth: this.configService.get('SMTP_USER')
        ? {
            user: this.configService.get('SMTP_USER'),
            pass: this.configService.get('SMTP_PASS'),
          }
        : undefined,
    });
  }

  /**
   * Send an email
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      const from = this.configService.get('SMTP_FROM', 'noreply@satcom.local');

      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * Send password reset email with branded template
   */
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
    const baseUrl = this.configService.get('WEB_URL', 'http://localhost:3004');
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - Satcom Workforce</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f5f5f5;">
          <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; width: 48px; height: 48px; background-color: #1a56db; border-radius: 10px; line-height: 48px; color: white; font-size: 24px; font-weight: bold;">S</div>
            </div>

            <h2 style="color: #1a1a2e; margin: 0 0 16px; font-size: 24px; text-align: center;">
              Reset Your Password
            </h2>

            <p style="color: #666; line-height: 1.6; margin: 0 0 24px;">
              You requested a password reset for your Satcom Workforce account. Click the button below to set a new password.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}"
                 style="display: inline-block; padding: 14px 32px; background-color: #1a56db;
                        color: white; text-decoration: none; border-radius: 8px; font-weight: 500;
                        font-size: 16px;">
                Reset Password
              </a>
            </div>

            <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
              This link expires in <strong>1 hour</strong>. If you didn't request this reset, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

            <p style="color: #aaa; font-size: 12px; margin: 0; text-align: center;">
              Can't click the button? Copy this link:<br>
              <a href="${resetUrl}" style="color: #1a56db; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>

          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
            Satcom Technologies - Workforce Visibility System
          </p>
        </body>
      </html>
    `;

    const text = `
Reset Your Password

You requested a password reset for your Satcom Workforce account.
Click the link below to set a new password (expires in 1 hour):

${resetUrl}

If you didn't request this reset, you can safely ignore this email.

--
Satcom Technologies - Workforce Visibility System
    `.trim();

    return this.sendEmail({
      to,
      subject: 'Reset Your Password - Satcom Workforce',
      html,
      text,
    });
  }
}
