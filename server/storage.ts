import { 
  investors, companies, investments, communications, meetings, funds, meetingLogs, ndrConferences, emailTemplates, emailCampaigns, analysts, documents,
  type Investor, type InsertInvestor,
  type Company, type InsertCompany,
  type Investment, type InsertInvestment,
  type Communication, type InsertCommunication,
  type Meeting, type InsertMeeting,
  type Fund, type InsertFund,
  type MeetingLog, type InsertMeetingLog,
  type NdrConference, type InsertNdrConference,
  type EmailTemplate, type InsertEmailTemplate,
  type EmailCampaign, type InsertEmailCampaign,
  type Analyst, type InsertAnalyst,
  type Document, type InsertDocument
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Investors
  getInvestors(): Promise<Investor[]>;
  getInvestor(id: number): Promise<Investor | undefined>;
  getInvestorByEmail(email: string): Promise<Investor | undefined>;
  createInvestor(investor: InsertInvestor): Promise<Investor>;
  updateInvestor(id: number, investor: Partial<InsertInvestor>): Promise<Investor | undefined>;
  deleteInvestor(id: number): Promise<boolean>;

  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<boolean>;

  // Investments
  getInvestments(): Promise<Investment[]>;
  getInvestment(id: number): Promise<Investment | undefined>;
  getInvestmentsByInvestor(investorId: number): Promise<Investment[]>;
  createInvestment(investment: InsertInvestment): Promise<Investment>;
  updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined>;
  deleteInvestment(id: number): Promise<boolean>;

  // Communications
  getCommunications(): Promise<Communication[]>;
  getCommunication(id: number): Promise<Communication | undefined>;
  getCommunicationsByInvestor(investorId: number): Promise<Communication[]>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  updateCommunication(id: number, communication: Partial<InsertCommunication>): Promise<Communication | undefined>;
  deleteCommunication(id: number): Promise<boolean>;

  // Meetings
  getMeetings(): Promise<Meeting[]>;
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetingsByInvestor(investorId: number): Promise<Meeting[]>;
  getUpcomingMeetings(): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: number): Promise<boolean>;

  // Funds
  getFunds(): Promise<Fund[]>;
  getFund(id: number): Promise<Fund | undefined>;
  getFundsByCompany(companyId: number): Promise<Fund[]>;
  createFund(fund: InsertFund): Promise<Fund>;
  updateFund(id: number, fund: Partial<InsertFund>): Promise<Fund | undefined>;
  deleteFund(id: number): Promise<boolean>;

  // Meeting Logs
  getMeetingLogs(): Promise<MeetingLog[]>;
  getMeetingLog(id: number): Promise<MeetingLog | undefined>;
  getMeetingLogsByInvestor(investorId: number): Promise<MeetingLog[]>;
  createMeetingLog(meetingLog: InsertMeetingLog): Promise<MeetingLog>;
  updateMeetingLog(id: number, meetingLog: Partial<InsertMeetingLog>): Promise<MeetingLog | undefined>;
  deleteMeetingLog(id: number): Promise<boolean>;

  // NDR/Conferences
  getNdrConferences(): Promise<NdrConference[]>;
  getNdrConference(id: number): Promise<NdrConference | undefined>;
  createNdrConference(ndrConference: InsertNdrConference): Promise<NdrConference>;
  updateNdrConference(id: number, ndrConference: Partial<InsertNdrConference>): Promise<NdrConference | undefined>;
  deleteNdrConference(id: number): Promise<boolean>;

  // Email Templates
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  getEmailTemplatesByLanguage(language: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;

  // Email Campaigns
  getEmailCampaigns(): Promise<EmailCampaign[]>;
  getEmailCampaign(id: number): Promise<EmailCampaign | undefined>;
  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  updateEmailCampaign(id: number, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined>;

  // Analysts
  getAnalysts(): Promise<Analyst[]>;
  getAnalyst(id: number): Promise<Analyst | undefined>;
  getAnalystByEmail(email: string): Promise<Analyst | undefined>;
  createAnalyst(analyst: InsertAnalyst): Promise<Analyst>;
  updateAnalyst(id: number, analyst: Partial<InsertAnalyst>): Promise<Analyst | undefined>;
  deleteAnalyst(id: number): Promise<boolean>;

  // Documents
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByCategory(category: string): Promise<Document[]>;
  getDocumentsByInvestor(investorId: number): Promise<Document[]>;
  getDocumentsByCompany(companyId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Investors
  async getInvestors(): Promise<Investor[]> {
    return await db.select().from(investors);
  }

  async getInvestor(id: number): Promise<Investor | undefined> {
    const [investor] = await db.select().from(investors).where(eq(investors.id, id));
    return investor || undefined;
  }

  async getInvestorByEmail(email: string): Promise<Investor | undefined> {
    const [investor] = await db.select().from(investors).where(eq(investors.email, email));
    return investor || undefined;
  }

  async createInvestor(insertInvestor: InsertInvestor): Promise<Investor> {
    const [investor] = await db
      .insert(investors)
      .values(insertInvestor)
      .returning();
    return investor;
  }

  async updateInvestor(id: number, updateData: Partial<InsertInvestor>): Promise<Investor | undefined> {
    const [investor] = await db
      .update(investors)
      .set(updateData)
      .where(eq(investors.id, id))
      .returning();
    return investor || undefined;
  }

  async deleteInvestor(id: number): Promise<boolean> {
    const result = await db.delete(investors).where(eq(investors.id, id));
    return result.rowCount! > 0;
  }

  // Companies
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).where(eq(companies.status, 'active'));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values(insertCompany)
      .returning();
    return company;
  }

  async updateCompany(id: number, updateData: Partial<InsertCompany>): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();
    return company || undefined;
  }

  async deleteCompany(id: number): Promise<boolean> {
    const result = await db.delete(companies).where(eq(companies.id, id));
    return result.rowCount! > 0;
  }

  // Investments
  async getInvestments(): Promise<Investment[]> {
    return await db.select().from(investments);
  }

  async getInvestment(id: number): Promise<Investment | undefined> {
    const [investment] = await db.select().from(investments).where(eq(investments.id, id));
    return investment || undefined;
  }

  async getInvestmentsByInvestor(investorId: number): Promise<Investment[]> {
    return await db.select().from(investments).where(eq(investments.investorId, investorId));
  }

  async createInvestment(insertInvestment: InsertInvestment): Promise<Investment> {
    const [investment] = await db
      .insert(investments)
      .values(insertInvestment)
      .returning();
    return investment;
  }

  async updateInvestment(id: number, updateData: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const [investment] = await db
      .update(investments)
      .set(updateData)
      .where(eq(investments.id, id))
      .returning();
    return investment || undefined;
  }

  async deleteInvestment(id: number): Promise<boolean> {
    const result = await db.delete(investments).where(eq(investments.id, id));
    return result.rowCount! > 0;
  }

  // Communications
  async getCommunications(): Promise<Communication[]> {
    return await db.select().from(communications);
  }

  async getCommunication(id: number): Promise<Communication | undefined> {
    const [communication] = await db.select().from(communications).where(eq(communications.id, id));
    return communication || undefined;
  }

  async getCommunicationsByInvestor(investorId: number): Promise<Communication[]> {
    return await db.select().from(communications).where(eq(communications.investorId, investorId));
  }

  async createCommunication(insertCommunication: InsertCommunication): Promise<Communication> {
    const [communication] = await db
      .insert(communications)
      .values(insertCommunication)
      .returning();
    return communication;
  }

  async updateCommunication(id: number, updateData: Partial<InsertCommunication>): Promise<Communication | undefined> {
    const [communication] = await db
      .update(communications)
      .set(updateData)
      .where(eq(communications.id, id))
      .returning();
    return communication || undefined;
  }

  async deleteCommunication(id: number): Promise<boolean> {
    const result = await db.delete(communications).where(eq(communications.id, id));
    return result.rowCount! > 0;
  }

  // Meetings
  async getMeetings(): Promise<Meeting[]> {
    return await db.select().from(meetings);
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting || undefined;
  }

  async getMeetingsByInvestor(investorId: number): Promise<Meeting[]> {
    return await db.select().from(meetings).where(eq(meetings.investorId, investorId));
  }

  async getUpcomingMeetings(): Promise<Meeting[]> {
    const now = new Date();
    const allMeetings = await db.select().from(meetings);
    
    // For development/testing, consider meetings in the near past as "upcoming" if they're within the last day
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return allMeetings
      .filter(meeting => meeting.scheduledDate && new Date(meeting.scheduledDate) > oneDayAgo)
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const [meeting] = await db
      .insert(meetings)
      .values(insertMeeting)
      .returning();
    return meeting;
  }

  async updateMeeting(id: number, updateData: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const [meeting] = await db
      .update(meetings)
      .set(updateData)
      .where(eq(meetings.id, id))
      .returning();
    return meeting || undefined;
  }

  async deleteMeeting(id: number): Promise<boolean> {
    const result = await db.delete(meetings).where(eq(meetings.id, id));
    return result.rowCount! > 0;
  }

  // Funds
  async getFunds(): Promise<Fund[]> {
    return await db.select().from(funds);
  }

  async getFund(id: number): Promise<Fund | undefined> {
    const [fund] = await db.select().from(funds).where(eq(funds.id, id));
    return fund || undefined;
  }

  async getFundsByCompany(companyId: number): Promise<Fund[]> {
    return await db.select().from(funds).where(eq(funds.companyId, companyId));
  }

  async createFund(insertFund: InsertFund): Promise<Fund> {
    const [fund] = await db
      .insert(funds)
      .values(insertFund)
      .returning();
    return fund;
  }

  async updateFund(id: number, updateData: Partial<InsertFund>): Promise<Fund | undefined> {
    const [fund] = await db
      .update(funds)
      .set(updateData)
      .where(eq(funds.id, id))
      .returning();
    return fund || undefined;
  }

  async deleteFund(id: number): Promise<boolean> {
    const result = await db.delete(funds).where(eq(funds.id, id));
    return result.rowCount! > 0;
  }

  // Meeting Logs
  async getMeetingLogs(): Promise<MeetingLog[]> {
    return await db.select().from(meetingLogs);
  }

  async getMeetingLog(id: number): Promise<MeetingLog | undefined> {
    const [meetingLog] = await db.select().from(meetingLogs).where(eq(meetingLogs.id, id));
    return meetingLog || undefined;
  }

  async getMeetingLogsByInvestor(investorId: number): Promise<MeetingLog[]> {
    return await db.select().from(meetingLogs).where(eq(meetingLogs.investorId, investorId));
  }

  async createMeetingLog(insertMeetingLog: InsertMeetingLog): Promise<MeetingLog> {
    const [meetingLog] = await db
      .insert(meetingLogs)
      .values(insertMeetingLog)
      .returning();
    return meetingLog;
  }

  async updateMeetingLog(id: number, updateData: Partial<InsertMeetingLog>): Promise<MeetingLog | undefined> {
    const [meetingLog] = await db
      .update(meetingLogs)
      .set(updateData)
      .where(eq(meetingLogs.id, id))
      .returning();
    return meetingLog || undefined;
  }

  async deleteMeetingLog(id: number): Promise<boolean> {
    const result = await db.delete(meetingLogs).where(eq(meetingLogs.id, id));
    return result.rowCount! > 0;
  }

  // NDR/Conference methods
  async getNdrConferences(): Promise<NdrConference[]> {
    return await db.select().from(ndrConferences).orderBy(desc(ndrConferences.startDate));
  }

  async getNdrConference(id: number): Promise<NdrConference | undefined> {
    const [conference] = await db.select().from(ndrConferences).where(eq(ndrConferences.id, id));
    return conference || undefined;
  }

  async createNdrConference(insertConference: InsertNdrConference): Promise<NdrConference> {
    const [conference] = await db
      .insert(ndrConferences)
      .values(insertConference)
      .returning();
    return conference;
  }

  async updateNdrConference(id: number, updateData: Partial<InsertNdrConference>): Promise<NdrConference | undefined> {
    const [conference] = await db
      .update(ndrConferences)
      .set(updateData)
      .where(eq(ndrConferences.id, id))
      .returning();
    return conference || undefined;
  }

  async deleteNdrConference(id: number): Promise<boolean> {
    const result = await db.delete(ndrConferences).where(eq(ndrConferences.id, id));
    return result.rowCount! > 0;
  }

  // Email Template methods
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template || undefined;
  }

  async getEmailTemplatesByLanguage(language: string): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).where(eq(emailTemplates.language, language));
  }

  async createEmailTemplate(insertTemplate: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await db
      .insert(emailTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async updateEmailTemplate(id: number, updateData: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .update(emailTemplates)
      .set(updateData)
      .where(eq(emailTemplates.id, id))
      .returning();
    return template || undefined;
  }

  async deleteEmailTemplate(id: number): Promise<boolean> {
    const result = await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
    return result.rowCount! > 0;
  }

  // Email Campaign methods
  async getEmailCampaigns(): Promise<EmailCampaign[]> {
    return await db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.createdAt));
  }

  async getEmailCampaign(id: number): Promise<EmailCampaign | undefined> {
    const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id));
    return campaign || undefined;
  }

  async createEmailCampaign(insertCampaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const [campaign] = await db
      .insert(emailCampaigns)
      .values(insertCampaign)
      .returning();
    return campaign;
  }

  async updateEmailCampaign(id: number, updateData: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined> {
    const [campaign] = await db
      .update(emailCampaigns)
      .set(updateData)
      .where(eq(emailCampaigns.id, id))
      .returning();
    return campaign || undefined;
  }

  // Analysts
  async getAnalysts(): Promise<Analyst[]> {
    return await db.select().from(analysts);
  }

  async getAnalyst(id: number): Promise<Analyst | undefined> {
    const [analyst] = await db.select().from(analysts).where(eq(analysts.id, id));
    return analyst || undefined;
  }

  async getAnalystByEmail(email: string): Promise<Analyst | undefined> {
    const [analyst] = await db.select().from(analysts).where(eq(analysts.email, email));
    return analyst || undefined;
  }

  async createAnalyst(insertAnalyst: InsertAnalyst): Promise<Analyst> {
    const [analyst] = await db
      .insert(analysts)
      .values(insertAnalyst)
      .returning();
    return analyst;
  }

  async updateAnalyst(id: number, updateData: Partial<InsertAnalyst>): Promise<Analyst | undefined> {
    const [analyst] = await db
      .update(analysts)
      .set(updateData)
      .where(eq(analysts.id, id))
      .returning();
    return analyst || undefined;
  }

  async deleteAnalyst(id: number): Promise<boolean> {
    const result = await db.delete(analysts).where(eq(analysts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Documents
  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async getDocumentsByCategory(category: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.category, category)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByInvestor(investorId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.investorId, investorId)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByCompany(companyId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.companyId, companyId)).orderBy(desc(documents.createdAt));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }

  async updateDocument(id: number, updateData: Partial<InsertDocument>): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return document || undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
