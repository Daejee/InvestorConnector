import { MailService } from '@sendgrid/mail';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { EmailTemplate, Investor } from '@shared/schema';

// Check for email service configuration
const hasAWS = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION;
const hasSendGrid = process.env.SENDGRID_API_KEY;

if (!hasAWS && !hasSendGrid) {
  console.warn("No email service configured. Email functionality will be limited.");
} else if (hasAWS) {
  console.log("Using AWS SES for email service");
} else if (hasSendGrid) {
  console.log("Using SendGrid for email service");
}

// Initialize SendGrid
const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize AWS SES
let sesClient: SESClient | null = null;
if (hasAWS) {
  sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
  });
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
    // If no email service is configured, log for development
    if (!hasAWS && !hasSendGrid) {
      console.log('Email would be sent:', params);
      return true; // Mock success for development
    }

    // Prefer AWS SES if configured
    if (hasAWS && sesClient) {
      try {
        const command = new SendEmailCommand({
          Source: params.from || this.DEFAULT_FROM,
          Destination: {
            ToAddresses: [params.to],
          },
          Message: {
            Subject: {
              Data: params.subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: params.html,
                Charset: 'UTF-8',
              },
            },
          },
        });

        await sesClient.send(command);
        console.log(`Email sent via AWS SES to: ${params.to}`);
        return true;
      } catch (error) {
        console.error('AWS SES email error:', error);
        return false;
      }
    }

    // Fallback to SendGrid
    if (hasSendGrid) {
      try {
        await mailService.send({
          to: params.to,
          from: params.from || this.DEFAULT_FROM,
          subject: params.subject,
          html: params.html,
        });
        console.log(`Email sent via SendGrid to: ${params.to}`);
        return true;
      } catch (error) {
        console.error('SendGrid email error:', error);
        return false;
      }
    }

    return false;
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