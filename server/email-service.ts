import { MailService } from '@sendgrid/mail';
import type { EmailTemplate, Investor } from '@shared/schema';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY not found. Email functionality will be limited.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface SendCampaignParams {
  template: EmailTemplate;
  investors: Investor[];
  campaignName: string;
}

export class EmailService {
  private static readonly DEFAULT_FROM = 'noreply@ircrm.com';

  static async sendSingleEmail(params: EmailParams): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('Email would be sent:', params);
      return true; // Mock success for development
    }

    try {
      await mailService.send({
        to: params.to,
        from: params.from || this.DEFAULT_FROM,
        subject: params.subject,
        html: params.html,
      });
      return true;
    } catch (error) {
      console.error('SendGrid email error:', error);
      return false;
    }
  }

  static async sendEarningsReport(params: SendCampaignParams): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    results: Array<{ investor: Investor; success: boolean; error?: string }>;
  }> {
    const results: Array<{ investor: Investor; success: boolean; error?: string }> = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const investor of params.investors) {
      try {
        const personalizedContent = this.personalizeTemplate(params.template.content, investor);
        const personalizedSubject = this.personalizeTemplate(params.template.subject, investor);

        const success = await this.sendSingleEmail({
          to: investor.email,
          subject: personalizedSubject,
          html: personalizedContent,
        });

        if (success) {
          sentCount++;
          results.push({ investor, success: true });
        } else {
          failedCount++;
          results.push({ investor, success: false, error: 'Failed to send email' });
        }
      } catch (error) {
        failedCount++;
        results.push({ 
          investor, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      results,
    };
  }

  static personalizeTemplate(template: string, investor: Investor): string {
    return template
      .replace(/\{\{investorName\}\}/g, investor.name)
      .replace(/\{\{companyName\}\}/g, investor.company)
      .replace(/\{\{email\}\}/g, investor.email)
      .replace(/\{\{position\}\}/g, investor.position || '')
      .replace(/\{\{fund\}\}/g, investor.fund || '')
      .replace(/\{\{country\}\}/g, investor.country || 'Korea')
      .replace(/\{\{language\}\}/g, investor.language || 'Korean');
  }

  static getAvailableVariables(): string[] {
    return [
      '{{investorName}}',
      '{{companyName}}', 
      '{{email}}',
      '{{position}}',
      '{{fund}}',
      '{{country}}',
      '{{language}}'
    ];
  }
}